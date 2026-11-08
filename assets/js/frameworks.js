window.FRAMEWORKS = {
  "categories": [
    {
      "id": "ad",
      "label": "Active Directory",
      "frameworks": [
        "bloodhound-ad"
      ]
    },
    {
      "id": "ai",
      "label": "AI / LLM",
      "frameworks": [
        "owasp-llm-top-10",
        "mitre-atlas"
      ]
    },
    {
      "id": "attack-it",
      "label": "ATT&CK · IT",
      "frameworks": [
        "mitre-attack-enterprise"
      ]
    },
    {
      "id": "attack-ot",
      "label": "ATT&CK · OT",
      "frameworks": [
        "mitre-attack-ics"
      ]
    },
    {
      "id": "cicd",
      "label": "CI/CD",
      "frameworks": [
        "owasp-cicd-top-10"
      ]
    },
    {
      "id": "entra",
      "label": "Entra ID",
      "frameworks": [
        "bloodhound-entra"
      ]
    },
    {
      "id": "k8s",
      "label": "Kubernetes",
      "frameworks": [
        "owasp-k8s-top-10"
      ]
    },
    {
      "id": "web",
      "label": "Web Application",
      "frameworks": [
        "owasp-top-10",
        "owasp-api-top-10",
        "owasp-wstg"
      ]
    }
  ],
  "frameworks": {
    "owasp-top-10": {
      "title": "OWASP Top 10",
      "version": "2025",
      "kind": "list",
      "source": {
        "name": "owasp.org/Top10/2025",
        "url": "https://owasp.org/Top10/2025/"
      },
      "blurb": "The eighth edition (2025) of the most widely referenced web application risk list. SSRF has been folded into A01. Software Supply Chain Failures (A03) and Mishandling of Exceptional Conditions (A10) are new.",
      "items": [
        {
          "id": "A01:2025",
          "title": "Broken Access Control",
          "summary": "Users act outside their intended permissions. Still number one, and it now also covers SSRF.",
          "points": [
            "Deny by default and enforce every check on the server",
            "Enforce record and object-level ownership",
            "Validate where server-side requests are allowed to go (SSRF)"
          ]
        },
        {
          "id": "A02:2025",
          "title": "Security Misconfiguration",
          "summary": "Insecure defaults, verbose errors, missing headers, exposed services and storage. Up from #5.",
          "points": [
            "Harden and template every environment the same way",
            "Remove unused features, accounts and defaults",
            "Review cloud storage and service exposure"
          ]
        },
        {
          "id": "A03:2025",
          "title": "Software Supply Chain Failures",
          "summary": "New. Compromise or weakness in building, distributing or updating software.",
          "points": [
            "Inventory dependencies with an SBOM",
            "Verify provenance and signatures of artifacts",
            "Harden the build pipeline (see the CI/CD Top 10)"
          ]
        },
        {
          "id": "A04:2025",
          "title": "Cryptographic Failures",
          "summary": "Missing, weak or misused cryptography and poor key handling. Down from #2.",
          "points": [
            "Encrypt sensitive data in transit and at rest",
            "Use strong, current algorithms and modes",
            "Manage keys and secrets outside the codebase"
          ]
        },
        {
          "id": "A05:2025",
          "title": "Injection",
          "summary": "Untrusted input read as a command or query, such as SQL, OS, LDAP or XSS. Down from number three.",
          "points": [
            "Use parameterised queries / prepared statements",
            "Validate and encode input by context",
            "Prefer safe APIs over string-built commands"
          ]
        },
        {
          "id": "A06:2025",
          "title": "Insecure Design",
          "summary": "Missing or ineffective control design. Down from #4.",
          "points": [
            "Threat model early and per-feature",
            "Use secure design patterns and reference architectures",
            "Write abuse cases alongside use cases"
          ]
        },
        {
          "id": "A07:2025",
          "title": "Authentication Failures",
          "summary": "Weak authentication, credential stuffing and session weaknesses.",
          "points": [
            "Support MFA and block known-breached passwords",
            "Rate-limit and monitor authentication",
            "Manage sessions with secure, rotated tokens"
          ]
        },
        {
          "id": "A08:2025",
          "title": "Software or Data Integrity Failures",
          "summary": "Trusting code or data without integrity checks, like insecure deserialization or unverified updates.",
          "points": [
            "Verify signatures on updates and dependencies",
            "Avoid unsafe deserialization of untrusted data",
            "Protect the integrity of the CI/CD pipeline"
          ]
        },
        {
          "id": "A09:2025",
          "title": "Security Logging & Alerting Failures",
          "summary": "Gaps in logging and alerting that let attacks run undetected.",
          "points": [
            "Log auth, access-control and server-side failures",
            "Alert on suspicious activity in near real time",
            "Protect logs from tampering and keep enough retention"
          ]
        },
        {
          "id": "A10:2025",
          "title": "Mishandling of Exceptional Conditions",
          "summary": "New. Unsafe error handling, failing open, and crashes from unexpected conditions.",
          "points": [
            "Fail closed on error for security decisions",
            "Handle exceptions without leaking detail",
            "Test unusual, boundary and error paths"
          ]
        }
      ]
    },
    "owasp-api-top-10": {
      "title": "OWASP API Security Top 10",
      "version": "2023",
      "kind": "list",
      "source": {
        "name": "owasp.org/API-Security",
        "url": "https://owasp.org/API-Security/editions/2023/en/0x11-t10/"
      },
      "blurb": "API-specific risks. Authorization dominates the top of the list, with BOLA, BOPLA and BFLA as three separate failure modes. SSRF and unsafe consumption of upstream APIs are newer additions.",
      "items": [
        {
          "id": "API1:2023",
          "title": "Broken Object Level Authorization (BOLA)",
          "summary": "An endpoint exposes object IDs without checking the caller may access that specific object.",
          "points": [
            "Enforce object-level authorization on every request",
            "Use random, unguessable object IDs",
            "Deny by default and verify the caller owns the object"
          ]
        },
        {
          "id": "API2:2023",
          "title": "Broken Authentication",
          "summary": "Flawed authentication lets attackers assume other identities.",
          "points": [
            "Use standard, vetted auth flows and strong tokens",
            "Rate-limit and lock out credential stuffing",
            "Validate token signature, issuer and audience, and keep them short-lived"
          ]
        },
        {
          "id": "API3:2023",
          "title": "Broken Object Property Level Authorization (BOPLA)",
          "summary": "Reading or writing object properties the caller shouldn't.",
          "points": [
            "Whitelist which properties each role may read/write",
            "Avoid blanket object binding (mass assignment)",
            "Return only the fields the caller needs"
          ]
        },
        {
          "id": "API4:2023",
          "title": "Unrestricted Resource Consumption",
          "summary": "No limits on requests, payload size or cost, which opens the door to DoS and runaway billing.",
          "points": [
            "Enforce rate, size and timeout limits",
            "Cap pagination and query complexity",
            "Set quotas and spending alerts on paid resources"
          ]
        },
        {
          "id": "API5:2023",
          "title": "Broken Function Level Authorization (BFLA)",
          "summary": "Users reach functions above their role.",
          "points": [
            "Deny by default on every function and route",
            "Enforce role checks server-side, not in the UI",
            "Separate and guard administrative endpoints"
          ]
        },
        {
          "id": "API6:2023",
          "title": "Unrestricted Access to Sensitive Business Flows",
          "summary": "Automation abuses a legitimate flow at scale.",
          "points": [
            "Identify flows attractive to automation",
            "Add bot/device detection and rate controls",
            "Require step-up or human verification where needed"
          ]
        },
        {
          "id": "API7:2023",
          "title": "Server Side Request Forgery (SSRF)",
          "summary": "The API fetches a user-supplied URL, reaching internal services and metadata endpoints.",
          "points": [
            "Validate and allow-list outbound URLs and hosts",
            "Block internal ranges and cloud metadata IPs",
            "Disable unused URL schemes and redirect following"
          ]
        },
        {
          "id": "API8:2023",
          "title": "Security Misconfiguration",
          "summary": "Insecure defaults, missing hardening, permissive CORS, verbose errors.",
          "points": [
            "Harden and patch the whole API stack",
            "Lock down CORS, security headers and error verbosity",
            "Automate secure, repeatable configuration"
          ]
        },
        {
          "id": "API9:2023",
          "title": "Improper Inventory Management",
          "summary": "Undocumented, deprecated or shadow endpoints and old versions.",
          "points": [
            "Maintain an inventory of APIs, versions and hosts",
            "Retire deprecated versions and shadow endpoints",
            "Separate and document non-production environments"
          ]
        },
        {
          "id": "API10:2023",
          "title": "Unsafe Consumption of APIs",
          "summary": "Trusting data from upstream/third-party APIs without validation.",
          "points": [
            "Validate third-party data like user input",
            "Use TLS and verify upstream responses",
            "Don't blindly follow upstream redirects"
          ]
        }
      ]
    },
    "owasp-wstg": {
      "title": "OWASP Web Security Testing Guide",
      "version": "v4.2 stable (v5.0 in development)",
      "kind": "list",
      "pointsLabel": "What's tested",
      "source": {
        "name": "owasp.org/wstg",
        "url": "https://owasp.org/www-project-web-security-testing-guide/"
      },
      "blurb": "The reference methodology for web application testing. Scenarios are referenced as WSTG-<CATEGORY>-<NN>. The twelve test categories below make up the Web Application Security Testing phase.",
      "items": [
        {
          "id": "WSTG-INFO",
          "title": "Information Gathering",
          "summary": "Fingerprinting, discovery and enumeration of the application and its surface.",
          "points": [
            "Search-engine and metadata reconnaissance",
            "Web server and framework fingerprinting",
            "Entry points, content and API discovery"
          ]
        },
        {
          "id": "WSTG-CONF",
          "title": "Configuration & Deployment Management",
          "summary": "Platform, infrastructure, methods, TLS, admin interfaces and file handling.",
          "points": [
            "Platform and infrastructure configuration",
            "HTTP methods, TLS and security headers",
            "Admin interfaces and file handling"
          ]
        },
        {
          "id": "WSTG-IDNT",
          "title": "Identity Management",
          "summary": "Roles, registration, provisioning and account enumeration.",
          "points": [
            "Role definitions and provisioning",
            "Account enumeration",
            "Registration and account policies"
          ]
        },
        {
          "id": "WSTG-ATHN",
          "title": "Authentication",
          "summary": "Credential transport, lockout, default creds, remember-me and recovery flows.",
          "points": [
            "Credential transport and storage",
            "Lockout and default credentials",
            "Remember-me and password recovery"
          ]
        },
        {
          "id": "WSTG-ATHZ",
          "title": "Authorization",
          "summary": "Traversal, privilege escalation and object-level checks.",
          "points": [
            "Directory traversal / file include",
            "IDOR and object-level checks",
            "Privilege escalation"
          ]
        },
        {
          "id": "WSTG-SESS",
          "title": "Session Management",
          "summary": "Cookie attributes, fixation, CSRF, logout and timeout.",
          "points": [
            "Cookie attributes and session handling",
            "Session fixation and logout",
            "CSRF and session timeout"
          ]
        },
        {
          "id": "WSTG-INPV",
          "title": "Input Validation",
          "summary": "Injection, XSS, SSRF and host-header issues.",
          "points": [
            "SQL/OS/LDAP and other injection",
            "Reflected, stored and DOM XSS",
            "SSRF and host-header injection"
          ]
        },
        {
          "id": "WSTG-ERRH",
          "title": "Error Handling",
          "summary": "Information leakage through errors and stack traces.",
          "points": [
            "Error message information leakage",
            "Stack traces and debug output"
          ]
        },
        {
          "id": "WSTG-CRYP",
          "title": "Weak Cryptography",
          "summary": "Transport security and sensitive data over weak channels.",
          "points": [
            "Transport-layer security (TLS)",
            "Padding-oracle weaknesses",
            "Sensitive data over unencrypted channels"
          ]
        },
        {
          "id": "WSTG-BUSL",
          "title": "Business Logic",
          "summary": "Logic flaws, workflow circumvention and abuse of functionality.",
          "points": [
            "Business-logic data validation",
            "Workflow circumvention",
            "Abuse of intended functionality"
          ]
        },
        {
          "id": "WSTG-CLNT",
          "title": "Client-side",
          "summary": "DOM XSS, clickjacking, postMessage and client-side storage.",
          "points": [
            "DOM XSS and client-side injection",
            "Clickjacking and CORS",
            "postMessage and client-side storage"
          ]
        },
        {
          "id": "WSTG-APIT",
          "title": "API Testing",
          "summary": "GraphQL and web-service specific testing (added in v4.2).",
          "points": [
            "GraphQL-specific testing",
            "Web-service / REST testing"
          ]
        }
      ]
    },
    "owasp-cicd-top-10": {
      "title": "OWASP Top 10 CI/CD Security Risks",
      "version": "2022",
      "kind": "list",
      "source": {
        "name": "owasp.org CI/CD Top 10",
        "url": "https://owasp.org/www-project-top-10-ci-cd-security-risks/"
      },
      "blurb": "Risks specific to the systems that build and ship software. Originated at Cider Security and adopted by OWASP. Referenced as CICD-SEC-N.",
      "items": [
        {
          "id": "CICD-SEC-1",
          "title": "Insufficient Flow Control Mechanisms",
          "summary": "Pushing code or artifacts to production without required reviews or gates.",
          "points": [
            "Require code review and protected branches",
            "Gate deploys with approvals",
            "Block direct pushes to protected targets"
          ]
        },
        {
          "id": "CICD-SEC-2",
          "title": "Inadequate Identity & Access Management",
          "summary": "Sprawling, over-permissioned and stale identities across SCM, CI and registries.",
          "points": [
            "Least privilege across SCM, CI and registry",
            "Remove stale identities and prefer SSO and short-lived creds",
            "Separate human and machine identities"
          ]
        },
        {
          "id": "CICD-SEC-3",
          "title": "Dependency Chain Abuse",
          "summary": "Dependency confusion, typosquatting and package-resolution abuse.",
          "points": [
            "Pin and verify dependencies",
            "Scope internal namespaces to block confusion",
            "Resolve through a vetted internal proxy/registry"
          ]
        },
        {
          "id": "CICD-SEC-4",
          "title": "Poisoned Pipeline Execution (PPE)",
          "summary": "Running attacker-influenced code in the pipeline, for example from a pull request.",
          "points": [
            "Isolate untrusted PR builds from secrets",
            "Don't run attacker-controlled config with privileges",
            "Separate build and deploy with distinct credentials"
          ]
        },
        {
          "id": "CICD-SEC-5",
          "title": "Insufficient PBAC (Pipeline-Based Access Controls)",
          "summary": "Pipeline runtimes with far more access than any job needs.",
          "points": [
            "Scope pipeline tokens to the job",
            "Use ephemeral, least-privilege runners",
            "Restrict what pipelines can reach on the network"
          ]
        },
        {
          "id": "CICD-SEC-6",
          "title": "Insufficient Credential Hygiene",
          "summary": "Secrets in logs, env vars and repos, plus long-lived, over-scoped tokens.",
          "points": [
            "Use a secrets manager and keep secrets out of repos and logs",
            "Short-lived, scoped, rotated credentials",
            "Scan continuously for leaked secrets"
          ]
        },
        {
          "id": "CICD-SEC-7",
          "title": "Insecure System Configuration",
          "summary": "Weak hardening of SCM, CI and artifact systems.",
          "points": [
            "Harden and baseline pipeline components",
            "Patch SCM/CI/artifact systems promptly",
            "Restrict network exposure of CI infrastructure"
          ]
        },
        {
          "id": "CICD-SEC-8",
          "title": "Ungoverned Usage of 3rd Party Services",
          "summary": "Broad, unmanaged trust granted to third-party apps and integrations.",
          "points": [
            "Inventory and review third-party integrations",
            "Grant least privilege and expire access",
            "Remove unused apps and OAuth grants"
          ]
        },
        {
          "id": "CICD-SEC-9",
          "title": "Improper Artifact Integrity Validation",
          "summary": "No verification that artifacts flowing through the pipeline are untampered.",
          "points": [
            "Sign artifacts and verify them on deploy",
            "Record provenance/attestations (e.g. SLSA)",
            "Use trusted, access-controlled registries"
          ]
        },
        {
          "id": "CICD-SEC-10",
          "title": "Insufficient Logging and Visibility",
          "summary": "Too little telemetry to detect or investigate pipeline compromise.",
          "points": [
            "Centralize pipeline and audit logs",
            "Alert on anomalous pipeline activity",
            "Retain logs long enough to investigate"
          ]
        }
      ]
    },
    "mitre-attack-enterprise": {
      "title": "MITRE ATT&CK Enterprise",
      "version": "IT · 15 tactics · ATT&CK v20.1",
      "kind": "matrix",
      "techLabel": "Techniques",
      "source": {
        "name": "attack.mitre.org/matrices/enterprise",
        "url": "https://attack.mitre.org/matrices/enterprise/"
      },
      "blurb": "Adversary tactics and techniques against enterprise IT, in lifecycle order from left to right. Each tactic lists its full set of parent techniques from ATT&CK v20.1, including the v18 split of Defense Evasion into Stealth (TA0005) and Defense Impairment (TA0112). Open a tactic to see its techniques, and the ID links to the live page.",
      "items": [
        {
          "id": "TA0043",
          "title": "Reconnaissance",
          "summary": "Gathering information to plan future operations.",
          "ref": "https://attack.mitre.org/tactics/TA0043/",
          "sub": [
            {
              "id": "T1595",
              "name": "Active Scanning"
            },
            {
              "id": "T1592",
              "name": "Gather Victim Host Information"
            },
            {
              "id": "T1589",
              "name": "Gather Victim Identity Information"
            },
            {
              "id": "T1590",
              "name": "Gather Victim Network Information"
            },
            {
              "id": "T1591",
              "name": "Gather Victim Org Information"
            },
            {
              "id": "T1598",
              "name": "Phishing for Information"
            },
            {
              "id": "T1682",
              "name": "Query Public AI Services"
            },
            {
              "id": "T1597",
              "name": "Search Closed Sources"
            },
            {
              "id": "T1596",
              "name": "Search Open Technical Databases"
            },
            {
              "id": "T1593",
              "name": "Search Open Websites/Domains"
            },
            {
              "id": "T1681",
              "name": "Search Threat Vendor Data"
            },
            {
              "id": "T1594",
              "name": "Search Victim-Owned Websites"
            }
          ]
        },
        {
          "id": "TA0042",
          "title": "Resource Development",
          "summary": "Establishing resources to support operations.",
          "ref": "https://attack.mitre.org/tactics/TA0042/",
          "sub": [
            {
              "id": "T1650",
              "name": "Acquire Access"
            },
            {
              "id": "T1583",
              "name": "Acquire Infrastructure"
            },
            {
              "id": "T1586",
              "name": "Compromise Accounts"
            },
            {
              "id": "T1584",
              "name": "Compromise Infrastructure"
            },
            {
              "id": "T1587",
              "name": "Develop Capabilities"
            },
            {
              "id": "T1585",
              "name": "Establish Accounts"
            },
            {
              "id": "T1683",
              "name": "Generate Content"
            },
            {
              "id": "T1588",
              "name": "Obtain Capabilities"
            },
            {
              "id": "T1608",
              "name": "Stage Capabilities"
            }
          ]
        },
        {
          "id": "TA0001",
          "title": "Initial Access",
          "summary": "Getting into your network.",
          "ref": "https://attack.mitre.org/tactics/TA0001/",
          "sub": [
            {
              "id": "T1659",
              "name": "Content Injection"
            },
            {
              "id": "T1189",
              "name": "Drive-by Compromise"
            },
            {
              "id": "T1190",
              "name": "Exploit Public-Facing Application"
            },
            {
              "id": "T1133",
              "name": "External Remote Services"
            },
            {
              "id": "T1200",
              "name": "Hardware Additions"
            },
            {
              "id": "T1566",
              "name": "Phishing"
            },
            {
              "id": "T1091",
              "name": "Replication Through Removable Media"
            },
            {
              "id": "T1195",
              "name": "Supply Chain Compromise"
            },
            {
              "id": "T1199",
              "name": "Trusted Relationship"
            },
            {
              "id": "T1078",
              "name": "Valid Accounts"
            },
            {
              "id": "T1669",
              "name": "Wi-Fi Networks"
            }
          ]
        },
        {
          "id": "TA0002",
          "title": "Execution",
          "summary": "Running malicious code or instructions on a system.",
          "ref": "https://attack.mitre.org/tactics/TA0002/",
          "sub": [
            {
              "id": "T1197",
              "name": "BITS Jobs"
            },
            {
              "id": "T1651",
              "name": "Cloud Administration Command"
            },
            {
              "id": "T1059",
              "name": "Command and Scripting Interpreter"
            },
            {
              "id": "T1609",
              "name": "Container Administration Command"
            },
            {
              "id": "T1610",
              "name": "Deploy Container"
            },
            {
              "id": "T1699",
              "name": "Direct Prompt Injection"
            },
            {
              "id": "T1675",
              "name": "ESXi Administration Command"
            },
            {
              "id": "T1203",
              "name": "Exploitation for Client Execution"
            },
            {
              "id": "T1574",
              "name": "Hijack Execution Flow"
            },
            {
              "id": "T1698",
              "name": "Indirect Prompt Injection"
            },
            {
              "id": "T1674",
              "name": "Input Injection"
            },
            {
              "id": "T1559",
              "name": "Inter-Process Communication"
            },
            {
              "id": "T1106",
              "name": "Native API"
            },
            {
              "id": "T1677",
              "name": "Poisoned Pipeline Execution"
            },
            {
              "id": "T1053",
              "name": "Scheduled Task/Job"
            },
            {
              "id": "T1648",
              "name": "Serverless Execution"
            },
            {
              "id": "T1129",
              "name": "Shared Modules"
            },
            {
              "id": "T1072",
              "name": "Software Deployment Tools"
            },
            {
              "id": "T1569",
              "name": "System Services"
            },
            {
              "id": "T1127",
              "name": "Trusted Developer Utilities Proxy Execution"
            },
            {
              "id": "T1204",
              "name": "User Execution"
            },
            {
              "id": "T1047",
              "name": "Windows Management Instrumentation"
            }
          ]
        },
        {
          "id": "TA0003",
          "title": "Persistence",
          "summary": "Maintaining their foothold.",
          "ref": "https://attack.mitre.org/tactics/TA0003/",
          "sub": [
            {
              "id": "T1098",
              "name": "Account Manipulation"
            },
            {
              "id": "T1197",
              "name": "BITS Jobs"
            },
            {
              "id": "T1547",
              "name": "Boot or Logon Autostart Execution"
            },
            {
              "id": "T1037",
              "name": "Boot or Logon Initialization Scripts"
            },
            {
              "id": "T1671",
              "name": "Cloud Application Integration"
            },
            {
              "id": "T1554",
              "name": "Compromise Host Software Binary"
            },
            {
              "id": "T1136",
              "name": "Create Account"
            },
            {
              "id": "T1543",
              "name": "Create or Modify System Process"
            },
            {
              "id": "T1546",
              "name": "Event Triggered Execution"
            },
            {
              "id": "T1668",
              "name": "Exclusive Control"
            },
            {
              "id": "T1133",
              "name": "External Remote Services"
            },
            {
              "id": "T1525",
              "name": "Implant Internal Image"
            },
            {
              "id": "T1556",
              "name": "Modify Authentication Process"
            },
            {
              "id": "T1112",
              "name": "Modify Registry"
            },
            {
              "id": "T1137",
              "name": "Office Application Startup"
            },
            {
              "id": "T1653",
              "name": "Power Settings"
            },
            {
              "id": "T1542",
              "name": "Pre-OS Boot"
            },
            {
              "id": "T1053",
              "name": "Scheduled Task/Job"
            },
            {
              "id": "T1505",
              "name": "Server Software Component"
            },
            {
              "id": "T1176",
              "name": "Software Extensions"
            },
            {
              "id": "T1205",
              "name": "Traffic Signaling"
            },
            {
              "id": "T1078",
              "name": "Valid Accounts"
            }
          ]
        },
        {
          "id": "TA0004",
          "title": "Privilege Escalation",
          "summary": "Gaining higher-level permissions.",
          "ref": "https://attack.mitre.org/tactics/TA0004/",
          "sub": [
            {
              "id": "T1548",
              "name": "Abuse Elevation Control Mechanism"
            },
            {
              "id": "T1134",
              "name": "Access Token Manipulation"
            },
            {
              "id": "T1098",
              "name": "Account Manipulation"
            },
            {
              "id": "T1547",
              "name": "Boot or Logon Autostart Execution"
            },
            {
              "id": "T1037",
              "name": "Boot or Logon Initialization Scripts"
            },
            {
              "id": "T1543",
              "name": "Create or Modify System Process"
            },
            {
              "id": "T1484",
              "name": "Domain or Tenant Policy Modification"
            },
            {
              "id": "T1611",
              "name": "Escape to Host"
            },
            {
              "id": "T1546",
              "name": "Event Triggered Execution"
            },
            {
              "id": "T1068",
              "name": "Exploitation for Privilege Escalation"
            },
            {
              "id": "T1055",
              "name": "Process Injection"
            },
            {
              "id": "T1053",
              "name": "Scheduled Task/Job"
            },
            {
              "id": "T1078",
              "name": "Valid Accounts"
            }
          ]
        },
        {
          "id": "TA0005",
          "title": "Stealth",
          "summary": "Hiding and concealing actions, appearing as normal behavior.",
          "ref": "https://attack.mitre.org/tactics/TA0005/",
          "sub": [
            {
              "id": "T1134",
              "name": "Access Token Manipulation"
            },
            {
              "id": "T1696",
              "name": "Anti-Automation Evasion"
            },
            {
              "id": "T1197",
              "name": "BITS Jobs"
            },
            {
              "id": "T1612",
              "name": "Build Image on Host"
            },
            {
              "id": "T1622",
              "name": "Debugger Evasion"
            },
            {
              "id": "T1678",
              "name": "Delay Execution"
            },
            {
              "id": "T1140",
              "name": "Deobfuscate/Decode Files or Information"
            },
            {
              "id": "T1006",
              "name": "Direct Volume Access"
            },
            {
              "id": "T1480",
              "name": "Execution Guardrails"
            },
            {
              "id": "T1211",
              "name": "Exploitation for Stealth"
            },
            {
              "id": "T1564",
              "name": "Hide Artifacts"
            },
            {
              "id": "T1574",
              "name": "Hijack Execution Flow"
            },
            {
              "id": "T1070",
              "name": "Indicator Removal"
            },
            {
              "id": "T1202",
              "name": "Indirect Command Execution"
            },
            {
              "id": "T1036",
              "name": "Masquerading"
            },
            {
              "id": "T1027",
              "name": "Obfuscated Files or Information"
            },
            {
              "id": "T1542",
              "name": "Pre-OS Boot"
            },
            {
              "id": "T1055",
              "name": "Process Injection"
            },
            {
              "id": "T1620",
              "name": "Reflective Code Loading"
            },
            {
              "id": "T1014",
              "name": "Rootkit"
            },
            {
              "id": "T1679",
              "name": "Selective Exclusion"
            },
            {
              "id": "T1684",
              "name": "Social Engineering"
            },
            {
              "id": "T1218",
              "name": "System Binary Proxy Execution"
            },
            {
              "id": "T1216",
              "name": "System Script Proxy Execution"
            },
            {
              "id": "T1221",
              "name": "Template Injection"
            },
            {
              "id": "T1205",
              "name": "Traffic Signaling"
            },
            {
              "id": "T1127",
              "name": "Trusted Developer Utilities Proxy Execution"
            },
            {
              "id": "T1535",
              "name": "Unused/Unsupported Cloud Regions"
            },
            {
              "id": "T1078",
              "name": "Valid Accounts"
            },
            {
              "id": "T1497",
              "name": "Virtualization/Sandbox Evasion"
            },
            {
              "id": "T1220",
              "name": "XSL Script Processing"
            }
          ]
        },
        {
          "id": "TA0112",
          "title": "Defense Impairment",
          "summary": "Breaking security mechanisms, pipelines and tooling so defenders can't see or trust what's happening.",
          "ref": "https://attack.mitre.org/tactics/TA0112/",
          "sub": [
            {
              "id": "T1686",
              "name": "Disable or Modify System Firewall"
            },
            {
              "id": "T1685",
              "name": "Disable or Modify Tools"
            },
            {
              "id": "T1484",
              "name": "Domain or Tenant Policy Modification"
            },
            {
              "id": "T1689",
              "name": "Downgrade Attack"
            },
            {
              "id": "T1687",
              "name": "Exploitation for Defense Impairment"
            },
            {
              "id": "T1222",
              "name": "File and Directory Permissions Modification"
            },
            {
              "id": "T1556",
              "name": "Modify Authentication Process"
            },
            {
              "id": "T1578",
              "name": "Modify Cloud Compute Infrastructure"
            },
            {
              "id": "T1666",
              "name": "Modify Cloud Resource Hierarchy"
            },
            {
              "id": "T1112",
              "name": "Modify Registry"
            },
            {
              "id": "T1601",
              "name": "Modify System Image"
            },
            {
              "id": "T1599",
              "name": "Network Boundary Bridging"
            },
            {
              "id": "T1647",
              "name": "Plist File Modification"
            },
            {
              "id": "T1690",
              "name": "Prevent Command History Logging"
            },
            {
              "id": "T1207",
              "name": "Rogue Domain Controller"
            },
            {
              "id": "T1688",
              "name": "Safe Mode Boot"
            },
            {
              "id": "T1553",
              "name": "Subvert Trust Controls"
            },
            {
              "id": "T1600",
              "name": "Weaken Encryption"
            }
          ]
        },
        {
          "id": "TA0006",
          "title": "Credential Access",
          "summary": "Stealing account names and passwords.",
          "ref": "https://attack.mitre.org/tactics/TA0006/",
          "sub": [
            {
              "id": "T1557",
              "name": "Adversary-in-the-Middle"
            },
            {
              "id": "T1110",
              "name": "Brute Force"
            },
            {
              "id": "T1555",
              "name": "Credentials from Password Stores"
            },
            {
              "id": "T1212",
              "name": "Exploitation for Credential Access"
            },
            {
              "id": "T1187",
              "name": "Forced Authentication"
            },
            {
              "id": "T1606",
              "name": "Forge Web Credentials"
            },
            {
              "id": "T1056",
              "name": "Input Capture"
            },
            {
              "id": "T1556",
              "name": "Modify Authentication Process"
            },
            {
              "id": "T1111",
              "name": "Multi-Factor Authentication Interception"
            },
            {
              "id": "T1621",
              "name": "Multi-Factor Authentication Request Generation"
            },
            {
              "id": "T1040",
              "name": "Network Sniffing"
            },
            {
              "id": "T1003",
              "name": "OS Credential Dumping"
            },
            {
              "id": "T1528",
              "name": "Steal Application Access Token"
            },
            {
              "id": "T1697",
              "name": "Steal Application Specific Passwords"
            },
            {
              "id": "T1649",
              "name": "Steal or Forge Authentication Certificates"
            },
            {
              "id": "T1558",
              "name": "Steal or Forge Kerberos Tickets"
            },
            {
              "id": "T1539",
              "name": "Steal Web Session Cookie"
            },
            {
              "id": "T1552",
              "name": "Unsecured Credentials"
            }
          ]
        },
        {
          "id": "TA0007",
          "title": "Discovery",
          "summary": "Figuring out your environment.",
          "ref": "https://attack.mitre.org/tactics/TA0007/",
          "sub": [
            {
              "id": "T1087",
              "name": "Account Discovery"
            },
            {
              "id": "T1010",
              "name": "Application Window Discovery"
            },
            {
              "id": "T1217",
              "name": "Browser Information Discovery"
            },
            {
              "id": "T1580",
              "name": "Cloud Infrastructure Discovery"
            },
            {
              "id": "T1538",
              "name": "Cloud Service Dashboard"
            },
            {
              "id": "T1526",
              "name": "Cloud Service Discovery"
            },
            {
              "id": "T1619",
              "name": "Cloud Storage Object Discovery"
            },
            {
              "id": "T1613",
              "name": "Container and Resource Discovery"
            },
            {
              "id": "T1622",
              "name": "Debugger Evasion"
            },
            {
              "id": "T1652",
              "name": "Device Driver Discovery"
            },
            {
              "id": "T1482",
              "name": "Domain Trust Discovery"
            },
            {
              "id": "T1083",
              "name": "File and Directory Discovery"
            },
            {
              "id": "T1615",
              "name": "Group Policy Discovery"
            },
            {
              "id": "T1680",
              "name": "Local Storage Discovery"
            },
            {
              "id": "T1654",
              "name": "Log Enumeration"
            },
            {
              "id": "T1046",
              "name": "Network Service Discovery"
            },
            {
              "id": "T1135",
              "name": "Network Share Discovery"
            },
            {
              "id": "T1040",
              "name": "Network Sniffing"
            },
            {
              "id": "T1201",
              "name": "Password Policy Discovery"
            },
            {
              "id": "T1120",
              "name": "Peripheral Device Discovery"
            },
            {
              "id": "T1069",
              "name": "Permission Groups Discovery"
            },
            {
              "id": "T1057",
              "name": "Process Discovery"
            },
            {
              "id": "T1012",
              "name": "Query Registry"
            },
            {
              "id": "T1018",
              "name": "Remote System Discovery"
            },
            {
              "id": "T1518",
              "name": "Software Discovery"
            },
            {
              "id": "T1082",
              "name": "System Information Discovery"
            },
            {
              "id": "T1614",
              "name": "System Location Discovery"
            },
            {
              "id": "T1016",
              "name": "System Network Configuration Discovery"
            },
            {
              "id": "T1049",
              "name": "System Network Connections Discovery"
            },
            {
              "id": "T1033",
              "name": "System Owner/User Discovery"
            },
            {
              "id": "T1007",
              "name": "System Service Discovery"
            },
            {
              "id": "T1124",
              "name": "System Time Discovery"
            },
            {
              "id": "T1673",
              "name": "Virtual Machine Discovery"
            },
            {
              "id": "T1497",
              "name": "Virtualization/Sandbox Evasion"
            }
          ]
        },
        {
          "id": "TA0008",
          "title": "Lateral Movement",
          "summary": "Moving through your environment.",
          "ref": "https://attack.mitre.org/tactics/TA0008/",
          "sub": [
            {
              "id": "T1210",
              "name": "Exploitation of Remote Services"
            },
            {
              "id": "T1534",
              "name": "Internal Spearphishing"
            },
            {
              "id": "T1570",
              "name": "Lateral Tool Transfer"
            },
            {
              "id": "T1563",
              "name": "Remote Service Session Hijacking"
            },
            {
              "id": "T1021",
              "name": "Remote Services"
            },
            {
              "id": "T1091",
              "name": "Replication Through Removable Media"
            },
            {
              "id": "T1072",
              "name": "Software Deployment Tools"
            },
            {
              "id": "T1080",
              "name": "Taint Shared Content"
            },
            {
              "id": "T1550",
              "name": "Use Alternate Authentication Material"
            }
          ]
        },
        {
          "id": "TA0009",
          "title": "Collection",
          "summary": "Gathering data of interest to their goal.",
          "ref": "https://attack.mitre.org/tactics/TA0009/",
          "sub": [
            {
              "id": "T1557",
              "name": "Adversary-in-the-Middle"
            },
            {
              "id": "T1560",
              "name": "Archive Collected Data"
            },
            {
              "id": "T1123",
              "name": "Audio Capture"
            },
            {
              "id": "T1119",
              "name": "Automated Collection"
            },
            {
              "id": "T1185",
              "name": "Browser Session Hijacking"
            },
            {
              "id": "T1115",
              "name": "Clipboard Data"
            },
            {
              "id": "T1530",
              "name": "Data from Cloud Storage"
            },
            {
              "id": "T1602",
              "name": "Data from Configuration Repository"
            },
            {
              "id": "T1213",
              "name": "Data from Information Repositories"
            },
            {
              "id": "T1005",
              "name": "Data from Local System"
            },
            {
              "id": "T1039",
              "name": "Data from Network Shared Drive"
            },
            {
              "id": "T1025",
              "name": "Data from Removable Media"
            },
            {
              "id": "T1074",
              "name": "Data Staged"
            },
            {
              "id": "T1114",
              "name": "Email Collection"
            },
            {
              "id": "T1056",
              "name": "Input Capture"
            },
            {
              "id": "T1113",
              "name": "Screen Capture"
            },
            {
              "id": "T1125",
              "name": "Video Capture"
            }
          ]
        },
        {
          "id": "TA0011",
          "title": "Command and Control",
          "summary": "Communicating with compromised systems to control them.",
          "ref": "https://attack.mitre.org/tactics/TA0011/",
          "sub": [
            {
              "id": "T1071",
              "name": "Application Layer Protocol"
            },
            {
              "id": "T1092",
              "name": "Communication Through Removable Media"
            },
            {
              "id": "T1659",
              "name": "Content Injection"
            },
            {
              "id": "T1132",
              "name": "Data Encoding"
            },
            {
              "id": "T1001",
              "name": "Data Obfuscation"
            },
            {
              "id": "T1568",
              "name": "Dynamic Resolution"
            },
            {
              "id": "T1573",
              "name": "Encrypted Channel"
            },
            {
              "id": "T1008",
              "name": "Fallback Channels"
            },
            {
              "id": "T1665",
              "name": "Hide Infrastructure"
            },
            {
              "id": "T1105",
              "name": "Ingress Tool Transfer"
            },
            {
              "id": "T1104",
              "name": "Multi-Stage Channels"
            },
            {
              "id": "T1095",
              "name": "Non-Application Layer Protocol"
            },
            {
              "id": "T1571",
              "name": "Non-Standard Port"
            },
            {
              "id": "T1572",
              "name": "Protocol Tunneling"
            },
            {
              "id": "T1090",
              "name": "Proxy"
            },
            {
              "id": "T1219",
              "name": "Remote Access Tools"
            },
            {
              "id": "T1205",
              "name": "Traffic Signaling"
            },
            {
              "id": "T1102",
              "name": "Web Service"
            }
          ]
        },
        {
          "id": "TA0010",
          "title": "Exfiltration",
          "summary": "Stealing data.",
          "ref": "https://attack.mitre.org/tactics/TA0010/",
          "sub": [
            {
              "id": "T1700",
              "name": "AI-Enabled Exfiltration"
            },
            {
              "id": "T1020",
              "name": "Automated Exfiltration"
            },
            {
              "id": "T1030",
              "name": "Data Transfer Size Limits"
            },
            {
              "id": "T1048",
              "name": "Exfiltration Over Alternative Protocol"
            },
            {
              "id": "T1041",
              "name": "Exfiltration Over C2 Channel"
            },
            {
              "id": "T1011",
              "name": "Exfiltration Over Other Network Medium"
            },
            {
              "id": "T1052",
              "name": "Exfiltration Over Physical Medium"
            },
            {
              "id": "T1567",
              "name": "Exfiltration Over Web Service"
            },
            {
              "id": "T1029",
              "name": "Scheduled Transfer"
            },
            {
              "id": "T1537",
              "name": "Transfer Data to Cloud Account"
            }
          ]
        },
        {
          "id": "TA0040",
          "title": "Impact",
          "summary": "Manipulating, interrupting or destroying your systems and data.",
          "ref": "https://attack.mitre.org/tactics/TA0040/",
          "sub": [
            {
              "id": "T1531",
              "name": "Account Access Removal"
            },
            {
              "id": "T1485",
              "name": "Data Destruction"
            },
            {
              "id": "T1486",
              "name": "Data Encrypted for Impact"
            },
            {
              "id": "T1565",
              "name": "Data Manipulation"
            },
            {
              "id": "T1491",
              "name": "Defacement"
            },
            {
              "id": "T1561",
              "name": "Disk Wipe"
            },
            {
              "id": "T1667",
              "name": "Email Bombing"
            },
            {
              "id": "T1499",
              "name": "Endpoint Denial of Service"
            },
            {
              "id": "T1657",
              "name": "Financial Theft"
            },
            {
              "id": "T1495",
              "name": "Firmware Corruption"
            },
            {
              "id": "T1490",
              "name": "Inhibit System Recovery"
            },
            {
              "id": "T1498",
              "name": "Network Denial of Service"
            },
            {
              "id": "T1496",
              "name": "Resource Hijacking"
            },
            {
              "id": "T1489",
              "name": "Service Stop"
            },
            {
              "id": "T1529",
              "name": "System Shutdown/Reboot"
            }
          ]
        }
      ]
    },
    "mitre-attack-ics": {
      "title": "MITRE ATT&CK for ICS",
      "version": "OT · 12 tactics · ATT&CK v20.1",
      "kind": "matrix",
      "techLabel": "Techniques",
      "source": {
        "name": "attack.mitre.org/matrices/ics",
        "url": "https://attack.mitre.org/matrices/ics/"
      },
      "blurb": "The ATT&CK knowledge base for industrial control systems. These are the adversary goals that matter once you are past IT and into OT. Each tactic lists its full set of techniques from ATT&CK v20.1.",
      "items": [
        {
          "id": "TA0108",
          "title": "Initial Access",
          "summary": "Getting into the ICS environment.",
          "ref": "https://attack.mitre.org/tactics/TA0108/",
          "sub": [
            {
              "id": "T0817",
              "name": "Drive-by Compromise"
            },
            {
              "id": "T0819",
              "name": "Exploit Public-Facing Application"
            },
            {
              "id": "T0866",
              "name": "Exploitation of Remote Services"
            },
            {
              "id": "T0822",
              "name": "External Remote Services"
            },
            {
              "id": "T0883",
              "name": "Internet Accessible Device"
            },
            {
              "id": "T0886",
              "name": "Remote Services"
            },
            {
              "id": "T0847",
              "name": "Replication Through Removable Media"
            },
            {
              "id": "T0848",
              "name": "Rogue Master"
            },
            {
              "id": "T0865",
              "name": "Spearphishing Attachment"
            },
            {
              "id": "T0862",
              "name": "Supply Chain Compromise"
            },
            {
              "id": "T0864",
              "name": "Transient Cyber Asset"
            },
            {
              "id": "T0860",
              "name": "Wireless Compromise"
            }
          ]
        },
        {
          "id": "TA0104",
          "title": "Execution",
          "summary": "Running code or manipulating system functions, parameters and data.",
          "ref": "https://attack.mitre.org/tactics/TA0104/",
          "sub": [
            {
              "id": "T0895",
              "name": "Autorun Image"
            },
            {
              "id": "T0858",
              "name": "Change Operating Mode"
            },
            {
              "id": "T1701",
              "name": "Command and Scripting Interpreter"
            },
            {
              "id": "T0871",
              "name": "Execution through API"
            },
            {
              "id": "T0823",
              "name": "Graphical User Interface"
            },
            {
              "id": "T0874",
              "name": "Hooking"
            },
            {
              "id": "T0821",
              "name": "Modify Controller Tasking"
            },
            {
              "id": "T0834",
              "name": "Native API"
            },
            {
              "id": "T0863",
              "name": "User Execution"
            }
          ]
        },
        {
          "id": "TA0110",
          "title": "Persistence",
          "summary": "Maintaining a foothold in the ICS environment.",
          "ref": "https://attack.mitre.org/tactics/TA0110/",
          "sub": [
            {
              "id": "T1694",
              "name": "Insecure Credentials"
            },
            {
              "id": "T1693",
              "name": "Modify Firmware"
            },
            {
              "id": "T0889",
              "name": "Modify Program"
            },
            {
              "id": "T0873",
              "name": "Project File Infection"
            },
            {
              "id": "T0859",
              "name": "Valid Accounts"
            }
          ]
        },
        {
          "id": "TA0111",
          "title": "Privilege Escalation",
          "summary": "Gaining higher-level permissions.",
          "ref": "https://attack.mitre.org/tactics/TA0111/",
          "sub": [
            {
              "id": "T0890",
              "name": "Exploitation for Privilege Escalation"
            },
            {
              "id": "T0874",
              "name": "Hooking"
            }
          ]
        },
        {
          "id": "TA0103",
          "title": "Evasion",
          "summary": "Avoiding detection and defensive controls.",
          "ref": "https://attack.mitre.org/tactics/TA0103/",
          "sub": [
            {
              "id": "T0858",
              "name": "Change Operating Mode"
            },
            {
              "id": "T0820",
              "name": "Exploitation for Evasion"
            },
            {
              "id": "T0872",
              "name": "Indicator Removal on Host"
            },
            {
              "id": "T0849",
              "name": "Masquerading"
            },
            {
              "id": "T0851",
              "name": "Rootkit"
            },
            {
              "id": "T0894",
              "name": "System Binary Proxy Execution"
            },
            {
              "id": "T1692",
              "name": "Unauthorized Message"
            }
          ]
        },
        {
          "id": "TA0102",
          "title": "Discovery",
          "summary": "Learning the ICS environment and its devices.",
          "ref": "https://attack.mitre.org/tactics/TA0102/",
          "sub": [
            {
              "id": "T0840",
              "name": "Network Connection Enumeration"
            },
            {
              "id": "T0842",
              "name": "Network Sniffing"
            },
            {
              "id": "T0846",
              "name": "Remote System Discovery"
            },
            {
              "id": "T0888",
              "name": "Remote System Information Discovery"
            },
            {
              "id": "T0887",
              "name": "Wireless Sniffing"
            }
          ]
        },
        {
          "id": "TA0109",
          "title": "Lateral Movement",
          "summary": "Moving through the ICS environment.",
          "ref": "https://attack.mitre.org/tactics/TA0109/",
          "sub": [
            {
              "id": "T0866",
              "name": "Exploitation of Remote Services"
            },
            {
              "id": "T1694",
              "name": "Insecure Credentials"
            },
            {
              "id": "T0867",
              "name": "Lateral Tool Transfer"
            },
            {
              "id": "T0843",
              "name": "Program Download"
            },
            {
              "id": "T0886",
              "name": "Remote Services"
            },
            {
              "id": "T0859",
              "name": "Valid Accounts"
            }
          ]
        },
        {
          "id": "TA0100",
          "title": "Collection",
          "summary": "Gathering process data and domain knowledge about the environment.",
          "ref": "https://attack.mitre.org/tactics/TA0100/",
          "sub": [
            {
              "id": "T0830",
              "name": "Adversary-in-the-Middle"
            },
            {
              "id": "T0802",
              "name": "Automated Collection"
            },
            {
              "id": "T0811",
              "name": "Data from Information Repositories"
            },
            {
              "id": "T0893",
              "name": "Data from Local System"
            },
            {
              "id": "T0868",
              "name": "Detect Operating Mode"
            },
            {
              "id": "T0877",
              "name": "I/O Image"
            },
            {
              "id": "T0801",
              "name": "Monitor Process State"
            },
            {
              "id": "T0861",
              "name": "Point & Tag Identification"
            },
            {
              "id": "T0845",
              "name": "Program Upload"
            },
            {
              "id": "T0852",
              "name": "Screen Capture"
            },
            {
              "id": "T0887",
              "name": "Wireless Sniffing"
            }
          ]
        },
        {
          "id": "TA0101",
          "title": "Command and Control",
          "summary": "Communicating with and controlling compromised ICS systems.",
          "ref": "https://attack.mitre.org/tactics/TA0101/",
          "sub": [
            {
              "id": "T0885",
              "name": "Commonly Used Port"
            },
            {
              "id": "T0884",
              "name": "Connection Proxy"
            },
            {
              "id": "T0869",
              "name": "Standard Application Layer Protocol"
            }
          ]
        },
        {
          "id": "TA0107",
          "title": "Inhibit Response Function",
          "summary": "Preventing safety, protection and alarm functions from responding to a failure, hazard or unsafe state.",
          "ref": "https://attack.mitre.org/tactics/TA0107/",
          "sub": [
            {
              "id": "T0800",
              "name": "Activate Firmware Update Mode"
            },
            {
              "id": "T0878",
              "name": "Alarm Suppression"
            },
            {
              "id": "T1695",
              "name": "Block Communications"
            },
            {
              "id": "T1691",
              "name": "Block Operational Technology Message"
            },
            {
              "id": "T0892",
              "name": "Change Credential"
            },
            {
              "id": "T0809",
              "name": "Data Destruction"
            },
            {
              "id": "T0814",
              "name": "Denial of Service"
            },
            {
              "id": "T0816",
              "name": "Device Restart/Shutdown"
            },
            {
              "id": "T0835",
              "name": "Manipulate I/O Image"
            },
            {
              "id": "T0838",
              "name": "Modify Alarm Settings"
            },
            {
              "id": "T1693",
              "name": "Modify Firmware"
            },
            {
              "id": "T0851",
              "name": "Rootkit"
            },
            {
              "id": "T0881",
              "name": "Service Stop"
            }
          ]
        },
        {
          "id": "TA0106",
          "title": "Impair Process Control",
          "summary": "Manipulating, disabling or damaging the physical control process.",
          "ref": "https://attack.mitre.org/tactics/TA0106/",
          "sub": [
            {
              "id": "T0806",
              "name": "Brute Force I/O"
            },
            {
              "id": "T1693",
              "name": "Modify Firmware"
            },
            {
              "id": "T0836",
              "name": "Modify Parameter"
            },
            {
              "id": "T1692",
              "name": "Unauthorized Message"
            }
          ]
        },
        {
          "id": "TA0105",
          "title": "Impact",
          "summary": "Manipulating, interrupting or destroying ICS systems, data and their surrounding environment.",
          "ref": "https://attack.mitre.org/tactics/TA0105/",
          "sub": [
            {
              "id": "T0879",
              "name": "Damage to Property"
            },
            {
              "id": "T0813",
              "name": "Denial of Control"
            },
            {
              "id": "T0815",
              "name": "Denial of View"
            },
            {
              "id": "T0826",
              "name": "Loss of Availability"
            },
            {
              "id": "T0827",
              "name": "Loss of Control"
            },
            {
              "id": "T0828",
              "name": "Loss of Productivity and Revenue"
            },
            {
              "id": "T0837",
              "name": "Loss of Protection"
            },
            {
              "id": "T0880",
              "name": "Loss of Safety"
            },
            {
              "id": "T0829",
              "name": "Loss of View"
            },
            {
              "id": "T0831",
              "name": "Manipulation of Control"
            },
            {
              "id": "T0832",
              "name": "Manipulation of View"
            },
            {
              "id": "T0882",
              "name": "Theft of Operational Information"
            }
          ]
        }
      ]
    },
    "owasp-llm-top-10": {
      "title": "OWASP Top 10 for LLM Applications",
      "version": "2025",
      "kind": "list",
      "source": {
        "name": "genai.owasp.org",
        "url": "https://genai.owasp.org/llm-top-10/"
      },
      "blurb": "The current (2025) list from OWASP's GenAI Security Project. Prompt Injection is still number one. System Prompt Leakage and Vector and Embedding Weaknesses arrived with the RAG and agentic era.",
      "items": [
        {
          "id": "LLM01:2025",
          "title": "Prompt Injection",
          "summary": "Crafted input (direct or indirect) overrides intended instructions or exfiltrates data.",
          "points": [
            "Constrain model behaviour and privileges",
            "Treat all external content as untrusted",
            "Require human approval for high-impact actions"
          ]
        },
        {
          "id": "LLM02:2025",
          "title": "Sensitive Information Disclosure",
          "summary": "The model reveals secrets, PII or proprietary data through its outputs.",
          "points": [
            "Minimise and scrub data the model can reach",
            "Enforce access control on retrieved data",
            "Filter and redact sensitive output"
          ]
        },
        {
          "id": "LLM03:2025",
          "title": "Supply Chain",
          "summary": "Compromised models, datasets, adapters or plugins pulled from untrusted sources.",
          "points": [
            "Vet and pin models, adapters and datasets",
            "Verify provenance and signatures",
            "Use trusted model and registry sources"
          ]
        },
        {
          "id": "LLM04:2025",
          "title": "Data and Model Poisoning",
          "summary": "Manipulated training, fine-tuning or grounding data skews or backdoors the model.",
          "points": [
            "Vet and track training and grounding data",
            "Validate data integrity and sources",
            "Test models for backdoors and anomalies"
          ]
        },
        {
          "id": "LLM05:2025",
          "title": "Improper Output Handling",
          "summary": "Downstream systems trust and execute model output without validation.",
          "points": [
            "Treat model output as untrusted input",
            "Encode/validate before use (XSS, SQLi, RCE)",
            "Sandbox tools and downstream actions"
          ]
        },
        {
          "id": "LLM06:2025",
          "title": "Excessive Agency",
          "summary": "Too much functionality, permission or autonomy granted to the model or its tools.",
          "points": [
            "Grant minimal tools, permissions and autonomy",
            "Require confirmation for impactful actions",
            "Scope and log every tool call"
          ]
        },
        {
          "id": "LLM07:2025",
          "title": "System Prompt Leakage",
          "summary": "Treating the system prompt as a secret or a security boundary, which it is not.",
          "points": [
            "Keep secrets and authz out of the system prompt",
            "Enforce controls in application code",
            "Assume the prompt will become public"
          ]
        },
        {
          "id": "LLM08:2025",
          "title": "Vector and Embedding Weaknesses",
          "summary": "Unprotected vector stores / RAG data: injection, leakage and poisoning.",
          "points": [
            "Access-control and partition vector stores",
            "Validate and sanitise RAG content",
            "Watch for embedding inversion and leakage"
          ]
        },
        {
          "id": "LLM09:2025",
          "title": "Misinformation",
          "summary": "Unverified, confident output (hallucination) trusted at face value.",
          "points": [
            "Ground answers and cite sources",
            "Human review for high-stakes output",
            "Communicate uncertainty and verify facts"
          ]
        },
        {
          "id": "LLM10:2025",
          "title": "Unbounded Consumption",
          "summary": "No limits on inference volume or cost, leading to denial of wallet and resource exhaustion.",
          "points": [
            "Rate-limit and quota inference",
            "Cap input/output size and cost",
            "Monitor usage and set budget alerts"
          ]
        }
      ]
    },
    "mitre-atlas": {
      "title": "MITRE ATLAS",
      "version": "AI / ML",
      "kind": "matrix",
      "techLabel": "Note",
      "source": {
        "name": "atlas.mitre.org",
        "url": "https://atlas.mitre.org/matrices/ATLAS"
      },
      "blurb": "Adversarial Threat Landscape for AI Systems. It is ATT&CK modelled for machine-learning attack surfaces. The core tactics are shown below. MITRE expanded ATLAS to 16 tactics across the 2025 and 2026 releases, adding AI-specific Privilege Escalation, Credential Access and Command and Control, and it updates monthly, so treat the live matrix as authoritative.",
      "items": [
        {
          "id": "AML.TA0000",
          "title": "AI Model Access",
          "summary": "Gaining some level of access to the target model (API, app, or the model itself). AI-specific."
        },
        {
          "id": "AML.TA0001",
          "title": "AI Attack Staging",
          "summary": "Preparing an attack: proxy models, crafting adversarial data, verifying efficacy offline. AI-specific."
        },
        {
          "id": "AML.TA0002",
          "title": "Reconnaissance",
          "summary": "Gathering information about the AI system to plan operations."
        },
        {
          "id": "AML.TA0003",
          "title": "Resource Development",
          "summary": "Establishing AI artifacts, infrastructure, accounts and capabilities."
        },
        {
          "id": "AML.TA0004",
          "title": "Initial Access",
          "summary": "Gaining an initial foothold into the AI system or its surrounding environment."
        },
        {
          "id": "AML.TA0005",
          "title": "Execution",
          "summary": "Running adversary-controlled code or ML artifacts."
        },
        {
          "id": "AML.TA0006",
          "title": "Persistence",
          "summary": "Maintaining a foothold via AI artifacts or software."
        },
        {
          "id": "AML.TA0007",
          "title": "Defense Evasion",
          "summary": "Avoiding detection by ML-enabled and traditional defences."
        },
        {
          "id": "AML.TA0008",
          "title": "Discovery",
          "summary": "Learning the ML environment, artifacts and ontology."
        },
        {
          "id": "AML.TA0009",
          "title": "Collection",
          "summary": "Gathering ML artifacts and related information for the objective."
        },
        {
          "id": "AML.TA0010",
          "title": "Exfiltration",
          "summary": "Stealing ML artifacts, data or model information."
        },
        {
          "id": "AML.TA0011",
          "title": "Impact",
          "summary": "Degrading, manipulating or destroying AI systems and the decisions they drive."
        }
      ]
    },
    "bloodhound-ad": {
      "title": "Active Directory",
      "version": "Attack-path review",
      "kind": "query",
      "pointsLabel": "What's checked",
      "source": {
        "name": "Microsoft Learn · securing AD",
        "url": "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/best-practices-for-securing-active-directory"
      },
      "blurb": "Active Directory is the identity backbone of most enterprise networks, and attackers map it as a graph where every misconfiguration is an edge toward Domain Admin. Privilege escalation turns into a path-finding problem. These are the areas a security review looks at to find and close those routes before someone else walks them.",
      "items": [
        {
          "id": "AD-01",
          "title": "Kerberoastable accounts",
          "summary": "Service accounts whose SPNs let any domain user request an offline-crackable ticket.",
          "points": [
            "User accounts that carry a Service Principal Name",
            "Password strength and age on those accounts",
            "Whether any have a path to privileged groups"
          ]
        },
        {
          "id": "AD-02",
          "title": "AS-REP roastable accounts",
          "summary": "Accounts with Kerberos pre-authentication disabled, exposing crackable hashes.",
          "points": [
            "Accounts flagged 'do not require pre-authentication'",
            "Password strength on those accounts",
            "Privileges those accounts hold"
          ]
        },
        {
          "id": "AD-03",
          "title": "Attack paths to Domain Admins / Tier 0",
          "summary": "Whether principals can reach Domain Admins or other Tier 0 assets at all.",
          "points": [
            "Shortest paths into Domain Admins (RID 512)",
            "Paths into Enterprise Admins / Administrators",
            "Choke-point objects many paths run through"
          ]
        },
        {
          "id": "AD-04",
          "title": "Paths from a typical foothold",
          "summary": "Escalation routes reachable from an everyday or already-compromised account.",
          "points": [
            "Reachability from low-privilege and owned users",
            "Hop count and edge types on each path",
            "Quick wins versus long chains"
          ]
        },
        {
          "id": "AD-05",
          "title": "Excessive and dangerous ACLs",
          "summary": "Rights that let one principal take over another object.",
          "points": [
            "GenericAll / GenericWrite / WriteDacl / WriteOwner on users, groups and computers",
            "Control over OUs and GPOs",
            "ForceChangePassword and self-membership rights"
          ]
        },
        {
          "id": "AD-06",
          "title": "Kerberos delegation",
          "summary": "Delegation settings that allow impersonation of other principals.",
          "points": [
            "Computers or users with unconstrained delegation",
            "Constrained delegation targets",
            "Resource-based constrained delegation (RBCD) write rights"
          ]
        },
        {
          "id": "AD-07",
          "title": "DCSync / replication rights",
          "summary": "Who can replicate directory secrets and pull every domain hash.",
          "points": [
            "Principals with GetChanges + GetChangesAll on the domain",
            "Non-DC accounts holding replication rights",
            "Unexpected or stale grants"
          ]
        },
        {
          "id": "AD-08",
          "title": "Local admin and session exposure",
          "summary": "Where principals are local admin, and where privileged users are logged on.",
          "points": [
            "AdminTo relationships across hosts",
            "Sessions of Domain Admins on reachable hosts",
            "Derivative local admin granted via groups"
          ]
        },
        {
          "id": "AD-09",
          "title": "Credential and secret exposure",
          "summary": "Who can read managed passwords or reach cached secrets.",
          "points": [
            "Principals able to read LAPS passwords",
            "Read access to gMSA passwords",
            "Secrets reachable from reachable hosts"
          ]
        },
        {
          "id": "AD-10",
          "title": "AD CS misconfigurations (ESC)",
          "summary": "Certificate-template and CA settings that enable privilege escalation (ESC1-ESC8+).",
          "points": [
            "Templates allowing a requester-supplied SAN with a client-auth EKU",
            "Enrollment rights granted to low-privilege principals",
            "Vulnerable CA and web-enrollment (NTLM relay) settings"
          ]
        }
      ]
    },
    "bloodhound-entra": {
      "title": "Entra ID",
      "version": "Attack-path review",
      "kind": "query",
      "pointsLabel": "What's checked",
      "source": {
        "name": "Microsoft Learn · Entra security ops",
        "url": "https://learn.microsoft.com/en-us/entra/architecture/security-operations-privileged-accounts"
      },
      "blurb": "Entra ID (Azure AD) is the control plane for cloud identity, covering roles, applications, consent and hybrid trust. These are the areas a security review looks at to find routes toward Global Administrator or a full tenant takeover, on their own or chained up from on-prem Active Directory.",
      "items": [
        {
          "id": "AZ-01",
          "title": "Global Admins & privileged roles",
          "summary": "Who holds Global Administrator and other high-impact Entra roles.",
          "points": [
            "Global Administrator and Privileged Role Administrator holders",
            "Standing versus eligible (PIM) assignments",
            "Break-glass account hygiene"
          ]
        },
        {
          "id": "AZ-02",
          "title": "Paths to tenant control",
          "summary": "Whether lower-privilege principals can reach Global Admin or tenant takeover.",
          "points": [
            "Shortest paths to the tenant / Global Admin",
            "Paths via groups, roles and ownership",
            "Hybrid on-prem to cloud paths"
          ]
        },
        {
          "id": "AZ-03",
          "title": "App registrations & service principals",
          "summary": "Over-privileged apps and who can abuse their credentials.",
          "points": [
            "Apps with high Microsoft Graph app roles (RoleManagement, AppRoleAssignment, etc.)",
            "Who can add secrets or certificates to apps",
            "Ownership of apps and service principals"
          ]
        },
        {
          "id": "AZ-04",
          "title": "Consent & delegated permissions",
          "summary": "Risky OAuth grants and tenant consent settings.",
          "points": [
            "High-privilege delegated and application permissions granted",
            "User consent configuration",
            "Illicit-consent and dormant app grants"
          ]
        },
        {
          "id": "AZ-05",
          "title": "Group-based access & dynamic groups",
          "summary": "Groups that confer privilege and who can change them.",
          "points": [
            "Role-assignable groups and their owners",
            "Who can add members to privileged groups",
            "Dynamic-membership rules that can be gamed"
          ]
        },
        {
          "id": "AZ-06",
          "title": "Password reset & takeover rights",
          "summary": "Who can reset passwords or change authentication for others.",
          "points": [
            "Principals who can reset user passwords",
            "Authentication-method management rights",
            "Helpdesk/role scope over privileged users"
          ]
        },
        {
          "id": "AZ-07",
          "title": "Conditional Access & hybrid identity",
          "summary": "Gaps in Conditional Access and on-prem to cloud trust.",
          "points": [
            "CA coverage, exclusions and report-only policies",
            "MFA enforcement on privileged roles",
            "Seamless SSO / PTA / AD FS and Entra Connect server exposure"
          ]
        }
      ]
    },
    "owasp-k8s-top-10": {
      "title": "OWASP Kubernetes Top 10",
      "version": "2022 (2025 revision in progress)",
      "kind": "list",
      "source": {
        "name": "owasp.org Kubernetes Top Ten",
        "url": "https://owasp.org/www-project-kubernetes-top-ten/"
      },
      "blurb": "The most common risk areas when running Kubernetes, ordered by likelihood. The 2022 edition is the complete published list, and OWASP has a 2025 revision in progress.",
      "items": [
        {
          "id": "K01:2022",
          "title": "Insecure Workload Configurations",
          "summary": "Privileged or root containers, writable filesystems, missing security contexts.",
          "points": [
            "Drop privileges and avoid root or privileged containers",
            "Set securityContext, read-only FS, no host mounts",
            "Enforce with Pod Security Admission"
          ]
        },
        {
          "id": "K02:2022",
          "title": "Supply Chain Vulnerabilities",
          "summary": "Untrusted images, unsigned artifacts and vulnerable base layers.",
          "points": [
            "Use signed, scanned, minimal images",
            "Verify provenance (cosign / SLSA)",
            "Pull from trusted registries only"
          ]
        },
        {
          "id": "K03:2022",
          "title": "Overly Permissive RBAC Configurations",
          "summary": "Broad roles and bindings, like cluster-admin where namespace scope would do.",
          "points": [
            "Prefer least-privilege Roles over ClusterRoles",
            "Avoid cluster-admin and wildcard verbs",
            "Audit roles and bindings regularly"
          ]
        },
        {
          "id": "K04:2022",
          "title": "Lack of Centralized Policy Enforcement",
          "summary": "No admission control to enforce guardrails.",
          "points": [
            "Use admission control (OPA/Gatekeeper, Kyverno)",
            "Enforce policy consistently across clusters",
            "Fail closed on policy gaps"
          ]
        },
        {
          "id": "K05:2022",
          "title": "Inadequate Logging and Monitoring",
          "summary": "Audit logs and runtime visibility missing across control plane and workloads.",
          "points": [
            "Enable API audit logging",
            "Collect control-plane and runtime telemetry",
            "Alert on anomalous activity"
          ]
        },
        {
          "id": "K06:2022",
          "title": "Broken Authentication Mechanisms",
          "summary": "Weak or external service-account tokens and certificate-based auth.",
          "points": [
            "Avoid external or long-lived service-account tokens",
            "Use OIDC / short-lived creds and MFA",
            "Disable anonymous and legacy auth"
          ]
        },
        {
          "id": "K07:2022",
          "title": "Missing Network Segmentation Controls",
          "summary": "Flat pod networking with no NetworkPolicy.",
          "points": [
            "Apply default-deny NetworkPolicies",
            "Segment namespaces and tiers",
            "Consider a service mesh with mTLS"
          ]
        },
        {
          "id": "K08:2022",
          "title": "Secrets Management Failures",
          "summary": "Unencrypted secrets, secrets in env vars, over-broad access.",
          "points": [
            "Encrypt secrets at rest (KMS)",
            "Keep secrets out of env and images, and use a manager",
            "Scope and rotate secret access"
          ]
        },
        {
          "id": "K09:2022",
          "title": "Misconfigured Cluster Components",
          "summary": "Exposed kubelet, etcd or dashboard, and insecure API server flags.",
          "points": [
            "Lock down kubelet/etcd/dashboard/API flags",
            "Disable anonymous auth on components",
            "Baseline against CIS benchmarks"
          ]
        },
        {
          "id": "K10:2022",
          "title": "Outdated and Vulnerable Kubernetes Components",
          "summary": "Unpatched kubelet, API server and add-ons.",
          "points": [
            "Patch control plane, nodes and add-ons",
            "Track versions and CVEs",
            "Automate upgrades and lifecycle"
          ]
        }
      ]
    }
  },
  "attribution": "Reference material. MITRE ATT&CK® and ATLAS™ are © The MITRE Corporation, reused under MITRE's terms (ATT&CK content here is from v20.1). OWASP content is © the OWASP Foundation (CC BY-SA). The Active Directory and Entra ID sections summarise what an attack-path review examines. Links go to the authoritative, always-current sources."
};
