/* =========================================================================
   SITE CONTENT, edit this file to update the site. No build step needed.
   ========================================================================= */

window.SITE = {
  /* Markdown content loaded at runtime from /content (see assets/js/content.js).
     Add a new .md file and list its name here to publish it. */
  content: {
    about: "about.md",
    posts: [
      "apple-health-database-forensics.md",
      "cve-2013-3900-winverifytrust.md",
      "apple-ai-agents-full-disk-access.md"
    ],
    research: []
  },
  handle: "avdibasic",
  name: "Tarik Avdibašić",
  role: "Penetration Tester & Security Researcher",
  location: "Styria, Austria",
  github: "avdibasic",
  links: {
    github: "https://github.com/avdibasic",
    linkedin: "https://www.linkedin.com/in/tarik-avdibasic-a11647221/",
    email: "mailto:avdibasic@protonmail.com"
  },
  bio: [
    "Offensive Security Professional specializing in OT environments, Active Directory, internal networks, web applications, and red team engagements. I help enterprise clients strengthen their security posture across both IT and industrial control systems.",
    "Originally from Bosnia and Herzegovina and based in Austria since 2011, I transitioned from gastronomy into technology driven by a passion for software engineering and security. I hold a BSc in Business Software Development (FH Campus 02) and an MSc in IT and Mobile Security (FH Joanneum, 2024). My [master's thesis](https://epub.fh-joanneum.at/obvfhjhs/download/pdf/10569488) evaluated GPT-4 Turbo and GPT-4o for automated web application penetration testing, complemented by coursework in data science and AI. I am fluent in English, German, and BKS.",
    "In my client work, I simulate realistic attack chains, manually verify complex vulnerabilities, and deliver actionable remediation strategies for technical teams and executives. Beyond client engagements, I conduct OT vulnerability research with multiple disclosures pending CVE assignment and actively compete in CTFs, including a 1st place win in an international university competition focused on mobile forensics and analytics."
  ],
  focus: [
    "Industrial Infrastructure (OT / ICS)",
    "Active Directory",
    "Internal & External Infrastructure",
    "Public Attack Surface",
    "Web Application Security",
    "Exposure Mapping",
    "Network Security",
    "Network Segmentation Assessments",
    "Detection Validation (MITRE ATT&CK)",
    "Red Teaming",
    "Secure Code Review",
    "Social Engineering",
    "Security Awareness Training",
    "Physical Access"
  ],

  /* `blurb` feeds the career-timeline game under whoami. These are placeholders, rewrite them. */
  experience: [
    { role: "Penetration Tester", org: "Brightflare FlexCo", type: "Full-time", from: "Feb 2026", to: "Present", place: "Graz, Austria",
      tags: ["Industrial Infrastructure (OT / ICS)", "Active Directory", "Internal & External Infrastructure", "Web Application Security", "Network Security", "Detection Validation (MITRE ATT&CK)", "Red Teaming", "Secure Code Review", "Social Engineering", "Security Awareness Training", "Physical Access", "Security Research"],
      blurb: "Penetration testing and offensive security assessments for small and medium-sized enterprises (SMEs) and enterprise clients. The focus is penetration testing of web applications, internal and external infrastructure tests, network security assessments and Active Directory checks, involvement in larger full-scope red team engagements, and on-site OT pentests with physical assessments. Alongside client engagements I also conduct security research. Produced detailed reports and presented remediation to stakeholders." },
    { role: "Penetration Tester", org: "BearingPoint GmbH", from: "Apr 2025", to: "Feb 2026", place: "Graz, Austria",
      tags: ["Industrial Infrastructure (OT / ICS)", "Active Directory", "Internal & External Infrastructure", "Web Application Security", "Network Security", "Detection Validation (MITRE ATT&CK)", "Red Teaming", "Secure Code Review", "Social Engineering", "Security Awareness Training", "Physical Access"],
      blurb: "Penetration testing and offensive security assessments for small and medium-sized enterprises (SMEs) and enterprise clients. The focus was penetration testing of web applications, internal and external infrastructure tests, network security assessments and Active Directory checks, involvement in larger full-scope red team engagements, and on-site OT pentests with physical assessments. Produced detailed reports and presented remediation to stakeholders." },
    { role: "Penetration Tester", org: "Siemens AG", from: "Nov 2023", to: "Mar 2025", place: "Graz, Austria",
      tags: ["Software Security", "Hardware Security", "Industrial Protocol Fuzzing", "Reverse Engineering", "ICT Infrastructure Security"],
      blurb: "Product and infrastructure security testing across IT and OT. Testing Siemens hardware and software solutions with a focus on web and desktop application penetration testing, protocol testing across multiple industrial protocols like PROFINET, S7comm, OPC UA and Modbus, reverse engineering, as well as testing OT infrastructure in production halls on site." },
    { role: "Software Engineer", org: "GRINTEC GmbH", from: "Nov 2020", to: "Oct 2023", place: "Graz, Austria",
      tags: ["Full-Stack Software Engineer", "Test automation"],
      blurb: "Software engineer on web applications in the GIS domain. Built features, automated regression testing with Jenkins, Postman and Newman, and handled second and third level support. This engineering background is what I now use to read code and write findings developers can act on." }
  ],

  education: [
    { degree: "MSc IT & Mobile Security", org: "FH Joanneum", place: "Kapfenberg, Austria", from: "Feb 2023", to: "Oct 2024", note: "Average Grade 1.36",
      detail: "I started directly in the second semester after completing four bridging courses from the first. The programme centres on hands-on cyber security experience across both IT and mobile domains. Toward the end of my studies I represented our faculty's stand at the 2024 ICT conference in Vienna. My master's thesis evaluates and compares different AI models in their use for offensive security." },
    { degree: "MSc Data Science and Artificial Intelligence (first semester)", org: "FH Joanneum", place: "Graz, Austria", from: "Oct 2022", to: "Feb 2023", note: "Average Grade 1.66 · 22.5 ECTS",
      detail: "I attended only the first semester here, passing courses worth 22.5 ECTS, before deciding that my passion lay more in cybersecurity. The programme covers the development of artificial intelligence, statistics and the applied use of both in real-world settings." },
    { degree: "BSc Business Software Development", org: "FH Campus 02", place: "Graz, Austria", from: "Oct 2019", to: "Sep 2022", note: "Average Grade 1.60",
      detail: "A dual bachelor's programme. The first two semesters are full time, and from the third through the sixth semester it runs in a dual format that alternates between study and employment. Delivered in collaboration with FH JOANNEUM and TU Graz in the first year, it covers software engineering, business informatics, information technology and business administration, rounded out with project management, personality development and languages." }
  ],

  /* group: "offensive" | "engineering" | "management" | "other", drives filtering on the Certs tab */
  certs: [
    { name: "OffSec Certified Professional+", short: "OSCP+", issuer: "OffSec", issued: "Aug 2026", expires: "Aug 2029", group: "offensive",
      url: "https://credentials.offsec.com/ec755f36-f5b0-408e-945d-dddb12a0926f",
      learned: "OffSec's hands-on penetration testing certification. The course covers manual exploitation of Linux and Windows hosts, web application attacks, privilege escalation, network pivoting and Active Directory exploitation. The exam is a rigorous 24-hour practical test requiring the compromise of three standalone black-box servers and a full Active Directory domain starting from low-privilege credentials on one machine, followed by a professional report written under time pressure, which I completed in 12 hours." },
    { name: "OffSec Certified Professional", short: "OSCP", issuer: "OffSec", issued: "Aug 2026", group: "offensive",
      url: "https://credentials.offsec.com/e6c387fc-13c7-4ec9-8db2-78c733c372a4",
      learned: "OffSec's hands-on penetration testing certification. The course covers manual exploitation of Linux and Windows hosts, web application attacks, privilege escalation, network pivoting and Active Directory exploitation. The exam is a rigorous 24-hour practical test requiring the compromise of three standalone black-box servers and a full Active Directory domain starting from low-privilege credentials on one machine, followed by a professional report written under time pressure, which I completed in 12 hours." },
    { name: "OffSec Wireless Professional", short: "OSWP", issuer: "OffSec", issued: "Sep 2026", id: "OS-BWA-437700", group: "offensive",
      url: "https://credentials.offsec.com/3895b8f4-bdcb-43b1-81af-b2d15f859bc2#acc.AkdNbqlc",
      learned: "OffSec's hands-on penetration testing certification. The course covers hands-on wireless penetration testing, including capturing and cracking WPA/WPA2 handshakes, rogue AP deployment, and abusing common Wi-Fi misconfigurations. The certification requires passing a practical exam to compromise three enterprise Wi-Fi networks under time pressure, which I completed in just 90 minutes." },
    { name: "Software Supply Chain Security for Red Teamers", short: "SSC-RT", issuer: "SpecterOps", issued: "Oct 2026", id: "2jhc7r77e3uw", group: "offensive",
      url: "https://verify.skilljar.com/c/2jhc7r77e3uw",
      learned: "SpecterOps training on software supply chain attacks from a red team view. CI/CD pipelines, build systems, package registries and the trust relationships between them." },
    { name: "Kubernetes for Red Teamers", short: "K8S-RT", issuer: "SpecterOps", issued: "Oct 2026", id: "ydsi2u45c7ru", group: "offensive",
      url: "https://verify.skilljar.com/c/ydsi2u45c7ru",
      learned: "SpecterOps training on attacking Kubernetes. Workloads, RBAC, service account tokens and the paths that turn a single pod into control of the whole cluster." },
    { name: "OT Security Expert", short: "OOSE", issuer: "OPSWAT Academy", issued: "Oct 2026", expires: "Oct 2027", id: "-hpzPC4GrQ", group: "offensive",
      url: "https://learn.opswatacademy.com/certificate/-hpzPC4GrQ",
      learned: "OPSWAT's OT security track. A deep dive into the Purdue reference model and the IEC 62443 standard, covering OT network segmentation with zones and conduits, and the higher-level security considerations that set operational technology apart from IT." },
    { name: "DLL Hijacking: A New Spin on Proxying your Shellcode", short: "DLL", issuer: "Black Hills Information Security", issued: "Oct 2024", group: "other",
      url: "https://www.credential.net/fa1a020e-39cb-49c1-8e94-c11e855dd8eb",
      learned: "A Black Hills deep dive into DLL hijacking and using it to proxy shellcode execution, a practical defense-evasion technique." },
    { name: "Certified Professional for Software Architecture, Foundation Level", short: "CPSA-F", issuer: "iSAQB", issued: "Feb 2025", id: "2503-CPSAFL-250205120-DE", group: "engineering",
      url: "https://www.certible.com/de/verify/e4d47c80c935319060d016e7bf0acc94/",
      learned: "iSAQB foundation in software architecture. Structures, patterns, quality attributes and how to document and justify design decisions." },
    { name: "Container-Virtualisierung mit Docker-Grundlagen", short: "DOCKER", issuer: "tecTrain GmbH", issued: "Nov 2022", group: "other",
      learned: "Fundamentals of container virtualization with Docker. Images, containers, volumes and container networking." },
    { name: "ISTQB Certified Tester Foundation Level", short: "CTFL", issuer: "Certible", issued: "Sep 2021", id: "df789079c120abfc2ab7435fb0f0b597", group: "engineering",
      url: "https://www.certible.com/de/verify/?id=df789079c120abfc2ab7435fb0f0b597",
      learned: "ISTQB foundation in software testing. Test design techniques, test levels and the overall testing process." },
    { name: "EXIN Agile Scrum Product Owner", short: "ASPO", issuer: "EXIN", issued: "Aug 2021", id: "6402249.20819205", group: "management",
      url: "https://www.exin.com/certificate-authentication/",
      learned: "EXIN Agile Scrum Product Owner. Backlog management, prioritisation and the product owner's role within a Scrum team." }
  ],

  /* Blog posts. `body` is plain HTML. The real posts are loaded from content/blog. */
  posts: [],

  /* Research entries. status: "published" | "in progress" | "disclosure pending" */
  research: [
    { title: "OT / ICS vulnerability research — CVEs pending", area: "OT / ICS", status: "disclosure pending", year: "2026",
      summary: "Multiple vulnerabilities reported and awaiting CVE assignment. Writeups and proof-of-concepts will land in the repository once the vendors have fixed them.",
      url: "https://github.com/avdibasic" }
  ],

  /* Pinned repositories shown above the live GitHub list. Use for private or
     in-progress work that does not appear through the public GitHub API. */
  pinnedRepos: [
    { name: "KulinOne", description: "Offensive Security Platform, in the making.", status: "in progress", private: true }
  ],

  /* Arsenal: tools I reach for on engagements. Groups and tools are alphabetical. */
  arsenal: [
    { area: "Active Directory", tools: ["BloodHound", "Certipy", "Coercer", "Impacket", "Kerbrute", "Ldapdomaindump", "NetExec", "PetitPotam", "PingCastle", "PowerView", "Rubeus", "Whisker"] },
    { area: "C2 & Shells", tools: ["AdaptixC2", "Havoc", "Penelope", "Sliver", "Weevely3"] },
    { area: "Cloud Native", tools: ["Kube-hunter", "Kubectl", "Peirates", "Trivy"] },
    { area: "Code & Build", tools: ["Bash", "Docker", "Go", "Python"] },
    { area: "Credentials", tools: ["DSInternals", "Hashcat", "John the Ripper", "LaZagne", "Mimikatz", "Pypykatz", "Snaffler"] },
    { area: "Privilege Escalation", tools: ["LinPEAS", "Linux-exploit-suggester", "PrivescCheck", "Pspy", "Seatbelt", "SharpUp", "WinPEAS"] },
    { area: "Recon & Pivoting", tools: ["Amass", "Chisel", "Inveigh", "Ligolo-ng", "Masscan", "Nmap", "Responder", "Socat"] },
    { area: "TLS & Services", tools: ["Securityheaders", "Ssh-audit", "Testssl.sh"] },
    { area: "Web", tools: ["Burp Suite Pro", "Dirbuster", "Dirsearch", "Feroxbuster", "Ffuf", "Gobuster", "Jwt_tool", "Nikto", "Nuclei", "Sqlmap", "WPScan"] },
    { area: "Wireless", tools: ["Aircrack-ng", "Hcxdumptool", "Kismet"] }
  ]
};
