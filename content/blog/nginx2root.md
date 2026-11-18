---
title: "NGINX2Root: The decade-old HTTP/2 flaw enabling unauthenticated remote code execution (CVE-2026-123007)"
date: 2026-11-18
tags: nginx, rce, security, vulnerability, http2
summary: A deep dive into CVE-2026-123007, an integer overflow and unsigned underflow in NGINX's HTTP/2 flow control present since 2015, how glibc memory behavior enables reliable remote code execution with nginx worker privileges, and how to verify exposure and lock down your infrastructure.
---

## TL;DR

A decade-old vulnerability introduced with HTTP/2 support in nginx 1.9.5 allows unauthenticated attackers to achieve remote code execution with nginx worker privileges on affected servers.

[CVE-2026-123007](https://github.com/sfewer-r7/CVE-2026-123007) affects official nginx releases from 1.9.5 through 1.31.8 when the HTTP/2 module is compiled into the binary and HTTP/2 is enabled, provided the installation does not already include a backported fix. Even servers exclusively serving static files can be vulnerable.

Xint researchers also demonstrated how to chain this vulnerability with a separate Linux kernel SCTP vulnerability to escalate privileges to root, including escaping a Docker container to compromise the underlying host.

The vulnerability is part of NGINX2Root, a collection of five independent nginx RCE vulnerabilities and one Linux kernel privilege-escalation vulnerability.

Recommended action: Upgrade to nginx 1.31.9 when available. Until then, disabling HTTP/2 mitigates CVE-2026-123007 and CVE-2026-123633, but does not address the other three nginx vulnerabilities.

Proof-of-Concept: [https://github.com/sfewer-r7/CVE-2026-123007](https://github.com/sfewer-r7/CVE-2026-123007)

## Introduction

Some vulnerabilities hide in plain sight for a decade. CVE-2026-123007, part of the newly disclosed **NGINX2Root** vulnerability cluster, sits squarely in that category. Disclosed alongside several other high-severity memory-corruption flaws affecting HTTP/3, proxying, and mail modules, this particular bug has been lurking in NGINX's codebase since HTTP/2 support first landed in version 1.9.5 back in 2015. 

Official nginx releases from 1.9.5 through 1.31.8 are affected when the HTTP/2 module is compiled and enabled, and even servers dedicated strictly to serving static content can be vulnerable.

This post walks through the mechanics of the flaw, exposure verification, detection and investigation, and how to secure your servers.

![NGINX2root exploit demo showing attacker and victim terminals](assets/img/blog/nginx2root.gif)

## Affected Versions and Exposure Verification

Before inspecting logs or applying patches, verify whether your server runs an affected version and actually has the vulnerable feature active.

### 1. Check the Version
Print the nginx version string:
```bash
nginx -v 2>&1
```
Official releases from **1.9.5 through 1.31.8** contain the vulnerable code. Note that Linux distributions frequently backport security fixes without changing the upstream version number, so check your full package version against your distribution's security advisory.

### 2. Check for the HTTP/2 Module
Confirm whether the HTTP/2 module is compiled into the binary:
```bash
nginx -V 2>&1 | grep -q -- '--with-http_v2_module' \
  && echo 'HTTP2_MODULE=present' \
  || echo 'HTTP2_MODULE=absent'
```

### 3. Check Whether HTTP/2 Is Enabled in the Configuration
Search your configuration file directives:
```bash
sudo nginx -T 2>&1 \
  | sed 's/#.*//' \
  | grep -nE 'listen[[:space:]].*http2|^[[:space:]]*http2[[:space:]]+on[[:space:]]*;'
```

### 4. Check External HTTP/2 Reachability via OpenSSL
Test whether the server accepts HTTP/2 during a TLS handshake from an external endpoint (replace `{HOST}` with your domain/IP):
```bash
openssl s_client -connect {HOST}:443 -servername {HOST} -alpn h2 </dev/null 2>&1 \
  | grep -E 'ALPN protocol:|No ALPN negotiated|Connection refused|connect:errno|handshake failure'
```
If you see `ALPN protocol: h2`, the server accepts HTTP/2 externally. (Note: if a CDN or reverse proxy sits in front of nginx, this tests the proxy rather than the origin server directly).

## How the flaw works

An integer overflow in nginx's HTTP/2 flow-control accounting causes the connection send window to exceed its permitted maximum. This subsequently triggers an unsigned underflow in a bounds check, ultimately resulting in an out-of-bounds memory operation.

HTTP/2 uses connection-level and stream-level send windows to control how much DATA a server can transmit. nginx deducts credit when response DATA is queued and restores that credit if a stream is cancelled before the queued data is sent.

The vulnerability occurs because nginx does not properly validate the connection-level window when returning this queued credit.

An attacker can manipulate the sequence of queued DATA, WINDOW_UPDATE frames, and stream cancellations to push the connection send window beyond its permitted 31-bit maximum.

This creates an unsigned arithmetic underflow in a subsequent bounds check. The oversized window value is eventually interpreted as a negative signed value and converted back into an extremely large unsigned memory-copy length.

An interesting aspect of the exploit is that the oversized copy length does not necessarily result in an immediate crash. Xint found that the x86-64 glibc `memcpy()` implementation can handle this particular overflow in a way that allows carefully positioned memory reads and writes. This behavior provides the primitives needed to disclose memory addresses, corrupt heap metadata, and ultimately gain control of a cleanup function pointer. Xint's research demonstrates how this turns an otherwise potentially crashing memory-corruption bug into reliable remote code execution with nginx worker privileges.

Importantly, the vulnerability does not require an application backend. A server serving exclusively static files can also be affected, provided the vulnerable HTTP/2 code is enabled.

## Exploitability, Detection and Investigation

Although the vulnerability is remotely exploitable without authentication, successful exploitation involves manipulating HTTP/2 flow-control state and causing abnormal memory operations. Xint demonstrated successful exploitation against AWS, GCP, and Azure deployments, including publicly accessible HTTPS endpoints.

Because HTTP/2 control frames such as `WINDOW_UPDATE` and `RST_STREAM` are not logged as individual HTTP requests, an attack using CVE-2026-123007 leaves little direct evidence in standard access logs. Investigation requires reviewing multiple system and connection signals:

### 1. Check Connection Statistics
Inspect TCP statistics for port 443 on the target server:
```bash
sudo ss -tinp state established '( sport = :443 )'
```
Run the command twice, a short interval apart, and compare changes in `bytes_received` and `bytes_sent`. Look for long-lived connections from the same external IP where received bytes continue increasing rapidly while sent bytes remain comparatively low, and investigate whether the same source is creating numerous short-lived TLS connections.

### 2. Review Requests by Connection
Standard nginx access logs do not provide enough information to distinguish ordinary HTTP requests from unusual HTTP/2 control-frame activity. Xint recommends enabling a custom access log format that records connection IDs, request counts, request sizes, and request durations. Add this to your nginx `http` block:

```nginx
log_format h2_hunt '$time_iso8601 src=$remote_addr conn=$connection '
                   'requests=$connection_requests proto=$server_protocol '
                   'status=$status request_length=$request_length '
                   'bytes_sent=$bytes_sent request_time=$request_time';

access_log /var/log/nginx/h2-hunt.log h2_hunt;
```

After validating and reloading the configuration, inspect HTTP/2 requests:
```bash
sudo nginx -t && sudo nginx -s reload
sudo grep 'proto=HTTP/2.0' /var/log/nginx/h2-hunt.log | tail -n 200
```
Compare total logged request lengths for suspicious connections against received TCP bytes reported by `ss`. If received bytes continue increasing rapidly while logged request lengths remain relatively small, the client may be sending large volumes of HTTP/2 control frames that do not appear as individual HTTP requests.

### 3. Monitor Worker Process Command Execution
A normal nginx worker has no reason to run external programs (`execve`). Identify the worker account's UID:
```bash
ps -eo uid,user,pid,ppid,args | grep '[n]ginx: worker process'
```
On systems using `auditd`, add a rule using the numeric worker UID:
```bash
sudo auditctl -a always,exit -F arch=b64 -S execve,execveat -F euid=NGINX_UID -k nginx_worker_exec
```
Review records using:
```bash
sudo ausearch -k nginx_worker_exec -ts recent -i
```
*Note: This rule only records executions after installation, meaning an empty result cannot rule out an earlier compromise. Furthermore, other applications might use the same worker UID; inspect process IDs and parent process IDs to determine whether an event originated from an nginx worker.*

### 4. Check for Abnormal Worker Exits and Core Dumps
A failed exploit attempt can crash an nginx worker. Look for segmentation faults or worker exits in error logs and review core dumps:
```bash
sudo grep -Ei 'worker process.*exited|signal 11|segfault' /var/log/nginx/error.log
sudo coredumpctl list nginx
```

## The Broader "NGINX2Root" Cluster

CVE-2026-123007 is part of a larger cluster of five independent nginx RCE vulnerabilities and one separate Linux kernel privilege-escalation vulnerability disclosed simultaneously. While CVE-2026-123007 targets HTTP/2, other bugs in the cluster affect alternative configurations:
* **CVE-2026-123633:** HTTP/2 with requests forwarded to an upstream server (1.19.7+).
* **CVE-2026-121810:** HTTP/3 with requests forwarded to an upstream server (1.25.0+).
* **CVE-2026-123634:** Resolver, a request-derived `proxy_pass` destination, and mirror with `mirror_request_body off` (1.13.4+).
* **CVE-2026-113425:** Mail proxy using `proxy on` and `auth_http` (0.5.15+).

Each of the five nginx vulnerabilities represents an independent attack path and does not need to be chained together. Furthermore, Xint identified a separate Linux kernel vulnerability in the SCTP subsystem that can be chained with any of the nginx RCE vulnerabilities to obtain root privileges on the host.

## Remediation and Workarounds

F5 scheduled official patches for release in version 1.31.9. 

### 1. Update nginx
Upgrade to nginx 1.31.9 once the fixed release is available, or install the corresponding security update provided by your Linux distribution or vendor.

Do not rely exclusively on `nginx -v` to determine whether your installation is vulnerable. Distributions frequently backport security fixes without changing the upstream nginx version number. Check the full installed package version against your distribution's security advisory.

After updating, restart nginx or perform a supported live binary upgrade. A configuration reload alone does not replace the running executable.

### 2. Temporarily Disable HTTP/2
If immediate patching is not possible, disabling HTTP/2 mitigates CVE-2026-123007 and CVE-2026-123633. The exact configuration syntax depends on your version:

* **nginx 1.25.1 and later:** Set `http2 off;` in each affected server block and remove legacy `http2` parameters from `listen` directives.
```nginx
server {
    listen 443 ssl;
    http2 off;
    server_name example.com;
}
```

* **nginx 1.9.5 through 1.25.0:** Remove the `http2` parameter from the `listen` directive.
```nginx
server {
    listen 443 ssl;
    server_name example.com;
}
```

Validate and reload the configuration:
```bash
sudo nginx -t
sudo nginx -s reload
```

A configuration reload applies the new settings to new connections, but existing HTTP/2 connections can remain attached to old workers that are shutting down. If those workers continue running, a restart through the service manager may be necessary to terminate the existing connections. Be aware that restarting nginx forcibly disconnects active clients and can interrupt downloads, uploads, and other ongoing sessions.

**Important:** Disabling HTTP/2 does not mitigate the other three nginx vulnerabilities in the NGINX2Root cluster. Review the affected configuration requirements for CVE-2026-123634, CVE-2026-121810, and CVE-2026-113425.

### 3. Review Linux Kernel Exposure
Xint also identified a separate Linux kernel vulnerability in the SCTP subsystem that can be chained with nginx RCE to obtain root privileges.

Until a kernel fix is available, systems that do not require SCTP should consider preventing the SCTP kernel module from loading.

For systems using a loadable SCTP module, the following configuration prevents loading through modprobe:
```bash
echo "install sctp /bin/false" | sudo tee /etc/modprobe.d/disable-sctp.conf
```
This does not unload an already loaded module or disable SCTP compiled directly into the kernel.

CVE-2026-123007 serves as a stark reminder that protocol-level parsing bugs can endure for years inside foundational infrastructure software. Ensure your edge proxies are updated or stripped of HTTP/2 support until patches can be reliably deployed.

## References

[Xint. NGINX2Root: New Remote Code Execution Vulnerabilities in nginx Require Urgent Patching. Xint Blog, 18 November 2026.](https://xint.io/blog/nginx2root-remote-code-execution?_gl=1*1rw0m25*_gcl_au*MTIzNzU2MTE3OC4xNzk1MDI4OTMw)
