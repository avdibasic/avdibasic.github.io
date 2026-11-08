---
title: What an iPhone's health database remembers about you
date: 2026-11-07
tags: mobile-forensics, privacy, sqlite
summary: A general walk through the Apple Health SQLite database. What it stores, how device and OS provenance ties every number to a point in time, how workout and timezone records reconstruct movement, and why these artifacts carry real forensic weight.
---

Most people think of Apple Health as a step counter. Structurally it is one of the richest behavioural logs an ordinary phone keeps about its owner, and a large part of what it records has nothing to do with health at all. This post is a general tour of what the database holds, how the pieces join together, and why it has become a recurring source of evidence in digital forensic research.

## Summary

Apple Health stores far more than daily totals. Every measurement is tagged with the device and operating system that produced it, the timezone it was recorded in, and precise start and end times. Taken together these turn a pile of numbers into a timeline of which devices a person owned, when they travelled, how they moved through a day, and what their historical software-update behaviour looked like. None of that requires a medical record, a confession or a witness. It falls out of plain relational queries over a file that survives from one phone to the next.

**Version scope.** The table names, fields and relationships described here are based primarily on research involving iOS 16 and iOS 17. They should not be assumed to apply unchanged to every iOS release: table layouts, workout storage and provenance identifiers all shift between versions. Always validate the schema against the database actually in front of you before running any of the queries below.

## Where the data lives

On iOS the health store is a SQLite file named `healthdb_secure.sqlite`, held under a protected area of the device (`/private/var/mobile/Library/Health`). It is normally reached from a decrypted device acquisition or an encrypted iTunes or Finder backup rather than from the phone directly. In the iOS 16 era the database runs to over a hundred tables, but only a small set matters for most analysis:

- **`samples`**: one row per recorded interval, with start and end timestamps and a numeric data type.
- **`quantity_samples`**: the measured value for each sample, joined by `data_id`.
- **`metadata_values` / `metadata_keys`**: per sample key and value pairs, including workout weather coordinates.
- **`workouts` / `workout_activities`**: the activity type of each workout, stored as an integer code.
- **`location_series_data`**: full GPS route points for workouts on newer iOS versions.
- **`data_provenances`**: which device model, OS version and timezone produced a given row.
- **`objects`**: links each sample to its provenance entry through a creation timestamp.

The joins that matter most run in a short chain. A measurement in `samples` carries its value in `quantity_samples` and its link record in `objects`, and that link record points at the device and OS entry in `data_provenances`:

![How the core Apple Health tables join: samples links to quantity_samples and objects by data_id, and objects links to data_provenances by provenance](assets/img/blog/health-db-joins.svg)

One property makes the file unusually valuable: the same health history can persist long after a given handset is gone. It is worth being precise about why, because three different mechanisms are often blurred together. Health data can synchronise between devices through iCloud when that feature is switched on. It can also be carried onto a new phone through device migration or a restore from backup. And locally, the database itself retains a long history rather than rolling off after days. These are distinct mechanisms, and which ones are in play changes what an examiner can acquire and from where. That retention is also what sets the health store apart from location-rich but short-lived caches: research into the iOS `Cache.sqlite` location store, for instance, notes it tends to hold only about a week of data, whereas the health database can span years.

### Handling timestamps

Apple Health does not use the Unix epoch. It counts seconds since the first of January 2001, the Cocoa or Mac epoch. To read times in SQLite, add the 978307200 second offset. Resolve them to UTC as the canonical value, not to local time:

```
SELECT
  datetime(start_date + 978307200, 'unixepoch') AS start_utc,
  datetime(end_date   + 978307200, 'unixepoch') AS end_utc,
  data_type
FROM samples
WHERE data_type = 7;   -- 7 is the internal SQLite key for step count
                       -- (HKQuantityTypeIdentifierStepCount at the API level)
```

A word of caution on timezones, because it is an easy and consequential mistake. SQLite's `'localtime'` modifier converts a timestamp into the timezone of the machine running the query, not the timezone the event was recorded in. An examiner in Vienna analysing a phone used in Tokyo who reaches for `'localtime'` will silently relabel every event in Central European time and corrupt the whole timeline. Keep the stored value in UTC, then interpret the original local time separately using the `tz_name` recorded in the provenance data for that same row. That keeps the canonical timestamp defensible and the local interpretation explicit rather than accidental.

The integer `data_type` values are the database's own identifiers. They are not the `HKQuantityTypeIdentifier...` strings you see at the HealthKit API level, so anyone inspecting the raw file is working with the numeric codes and needs a mapping. The exact code to name mapping has also shifted across iOS versions, so it is worth confirming against the schema version in front of you rather than trusting a fixed list.

There are actually three timestamps worth separating. `start_date` and `end_date` bound the activity itself, while the creation time in the `objects` table marks when the row was written to the database. Those can diverge, sometimes by hours and in anomalous cases by close to a year, so an examiner who treats the creation time as the event time can build a timeline that is badly skewed.

## Hardware and software provenance

The analytical heart of the database is provenance. The `data_provenances` table records fields such as `origin_product_type` (a model code like `iPhone11,6` or `Watch3,2`), `source_version` and the separate `origin_major_version`, `origin_minor_version` and `origin_patch_version` fields, plus `tz_name`, the timezone in Country/Region/City form. Model codes translate to familiar market names through references such as EveryMac. Joining the tables attributes every data point to a specific device and OS build:

```
-- Schema based on the iOS 16/17 structure; verify column and key
-- names against the exact version of the database you are examining.
SELECT
  datetime(s.start_date + 978307200, 'unixepoch') AS start_utc,
  s.data_type,
  q.quantity,
  p.origin_product_type,   -- hardware model
  p.source_version,        -- OS version
  p.tz_name                -- recorded timezone (interpret local time from this)
FROM samples s
LEFT JOIN quantity_samples q ON s.data_id = q.data_id
LEFT JOIN objects o          ON s.data_id = o.data_id
LEFT JOIN data_provenances p ON o.provenance = p.ROWID  -- some versions
                                                        -- join via provenance_id
WHERE q.quantity IS NOT NULL
ORDER BY start_utc ASC;
```

The link from `objects` to `data_provenances` is the one to watch across versions. Here it is written as `o.provenance = p.ROWID`, but the column and the key it points at are not identical in every schema revision, so a join that returns nothing is usually a sign the provenance link is named differently in that database rather than that the data is missing.

### Why provenance matters

- **Device distinctions.** An iPhone counts steps, flights climbed and distance. An Apple Watch records those alongside heart rate, active and resting energy and workout intervals, so heart rate and energy entries are a strong signal that a watch was in active use.
- **Deduplication.** When someone carries a phone and a watch at once, the same movement is recorded twice. The Health app hides this by picking a priority source per data type when it shows a daily total, but that is a presentation choice in the UI. The raw SQLite database keeps both sets of rows intact, so an examiner working at the database level has to filter by `origin_product_type` explicitly to avoid inflated totals, and in doing so can also see each device's contribution separately.
- **A device and update timeline.** Because the file keeps years of provenance, the first appearance of each new model and OS build maps out when the owner acquired devices and when they updated them. Published research treats this as a synchronisation artifact: a single seized phone can reveal that several other devices were linked to the same Apple ID, which is a direct lead in the triage stage of an investigation.

### Which data type to trust

Not every metric is equally reliable for building a timeline. Research on this database found that distance records can lag badly, with creation times sometimes written long after the activity and with inconsistent version fields, while step counts carry second level precision, exist on both phones and watches, and keep clean provenance. That makes step count the workhorse for timeline work and distance something to treat with caution.

It is worth being careful about what a step-count record actually establishes, though, because this is exactly where a forensic conclusion gets challenged. Step-count records provide a useful temporal foundation for reconstruction, particularly when their provenance and recording intervals are independently validated. They should not be treated as proof that a particular person performed the recorded activity. Several things sit between the record and that conclusion: more than one device can contribute records, device ownership and usage can change hands over time, and synchronisation can affect when a record appears. At best the data shows that a device registered movement at a time. Who was carrying it is a separate question that needs separate evidence.

### Cyber hygiene as pattern of life

Once device and update dates are laid out, they can be compared against Apple's public release dates to measure how long the owner took to install each update. That turns a technical log into a behavioural profile, a form of pattern of life.

The same insight cuts the other way, though it is worth stating precisely what it does and does not give an adversary. An exposed update history does not by itself hand anyone an exploit: it does not establish that a device is currently vulnerable, that a specific vulnerability applies to it, that a workable exploitation path exists, or that past behaviour predicts future patching. What it offers is target prioritisation. It flags owners who have historically been slow to update, and combined with knowledge of their current software version and of known vulnerabilities, that lets an adversary focus effort on the targets most likely to still be running something exploitable. It is an intelligence and risk-profiling advantage rather than an attack in itself, and researchers flag it as a real concern as people increasingly share fitness exports with friends, family or online.

## Reconstructing movement

The database records location in two distinct ways, and both have caveats.

- **Workout coordinates.** For logged workouts, a latitude and longitude are stored in the weather metadata of the sample (the `_HKPrivateWorkoutWeatherLocationCoordinates...` keys). This is effectively the start location of the workout, and before iOS 16 it was the only coordinate source. Accuracy varies from a near exact fix to a few hundred metres off. Crucially, coordinates appear only for activities logged as workouts, so ordinary movement leaves no point here.
- **Full routes.** Newer iOS versions add `location_series_data`, which holds the full set of route points with their own timestamps. Its identifier does not line up cleanly with the workout or sample indexes, so joining a route back to its workout often takes manual alignment rather than a single query.

Two further points are worth knowing. Workout activity labels are not ground truth. Documented research found a watch recording a bell ringing session as rowing, which was only resolved with open source context about the location. And direct in app exports (`export.xml` plus per workout `.GPX` files) are less complete than the database and are written in the timezone of wherever the export was taken, not where the activity happened.

### Travel without any GPS

The most striking location technique needs no coordinates at all. Because every record carries a timezone, a sequence of timezone changes across step count entries maps international travel even when no network or GPS location log survives. Published work reconstructed a multi leg trip across continents purely from the timezone field on routine step records.

The important qualification belongs right here, before the technique is leaned on. A timezone change is evidence that the device's recorded timezone context changed. It is not, on its own, conclusive proof that the owner physically crossed a border. A manual timezone change, a configuration change, or a synchronisation or recording anomaly can produce the same signal as genuine travel, and the underlying research is explicit that timezone and location data can be inconsistent and need contextual interpretation. Two further wrinkles sharpen the point: international timezones tend to default to a country's capital rather than the actual city, so the field places a traveller in the right country and offset but not necessarily the right town. Treat a timezone shift as a strong lead that points to travel, then confirm it against flight records, photo EXIF, witnesses or other independent sources before relying on it.

## Forensic use cases

Pulling the threads together, the health database shows up in investigations in a few recurring roles:

- **Validation.** A photo's EXIF make, model and date can be checked against the provenance timeline to corroborate that the picture is consistent with a device the owner used at that time.
- **Attribution.** When several phones or watches are seized, the provenance history can indicate that they were all linked to the same Apple ID. That is an investigative lead toward common ownership, not standalone proof that one named person owned and used each device.
- **Intelligence and triage.** One device can point to the earlier existence and period of use of others, telling investigators where to look next rather than settling anything on its own.

## The privacy problem: correlation, not individual records

If there is one lesson to carry away, it is this. A single step-count row is almost meaningless. One OS build number is harmless. The privacy risk does not live in any individual field. It emerges when thousands of ordinary records are correlated: second-level step intervals against device provenance, against timezones, against workout start points, against the software versions in use at each moment. Stitched together, those unremarkable rows become a detailed behavioural profile, a years-long, 360-degree footprint of a person's routines, movements and habits that the owner never consciously set out to disclose. The security issue is the act of combination, not the content of any one record.

## Why this matters

Health telemetry is usually treated as casual, personal data. Structurally it is detailed forensic evidence: a years long, timestamped, device attributed record of activity, movement and routine that happens to sit inside an ordinary backup.

It helps to separate the protection of this data at rest from its exposure once something or someone has legitimate access to the decrypted contents, because the two call for different defences:

- **A lost or stolen but locked iPhone.** Here device encryption and a strong passcode are what stand between the finder and the data. This is the scenario full-disk encryption is built for.
- **A compromised Apple account.** Encryption on the handset is beside the point if an attacker is inside the account. Account security and multi-factor authentication, plus awareness of what is synchronised to iCloud, are what matter.
- **Access to an unlocked device or a decrypted backup.** Once the contents are decrypted, whether by a forensic examiner with lawful access, by malware on a trusted computer, or by anyone who got past the passcode, the full behavioural history is readable. Encryption has already done its job and offers nothing further here.

That third case is the one people underestimate. An encrypted database still exposes enormous amounts of personal information the moment an attacker or investigator obtains legitimate access to its decrypted form, so the sensible precautions extend past encryption: a strong device passcode, multi-factor authentication on the Apple account, protecting encrypted computer backups, limiting and controlling access to forensic acquisitions, and being deliberate about exported Health data rather than casually sharing fitness exports. The underlying lesson is simply that aggregation is not anonymisation, and that full-disk encryption alone does not solve the privacy problem once the data is open.

## References

Jennings, L., Espinosa, H. G., and Sorell, M. J. Apple Health Location Tracking in Micro and Macro Detail. DFRWS-APAC, 28 to 30 September 2022, Adelaide.

Jennings, L., Sorell, M., and Espinosa, H. G. Interpreting the location data extracted from the Apple Health database. Forensic Science International: Digital Investigation, volume 44 (2023), article 301504. [doi.org/10.1016/j.fsidi.2023.301504](https://doi.org/10.1016/j.fsidi.2023.301504)

Jennings, L., Sorell, M., and Espinosa, H. G. The provenance of Apple Health data: a timeline of update history. Forensic Science International: Digital Investigation, volume 50 (2024), article 301804. [doi.org/10.1016/j.fsidi.2024.301804](https://doi.org/10.1016/j.fsidi.2024.301804)
