import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, Optional

BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),       # Link-local & Cloud metadata (169.254.169.254)
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("224.0.0.0/4"),         # Multicast
    ipaddress.ip_network("240.0.0.0/4"),         # Reserved
    ipaddress.ip_network("255.255.255.255/32"),
    # IPv6
    ipaddress.ip_network("::1/128"),             # Loopback
    ipaddress.ip_network("::/128"),              # Unspecified
    ipaddress.ip_network("::ffff:0:0/96"),       # IPv4-mapped IPv6
    ipaddress.ip_network("64:ff9b::/96"),
    ipaddress.ip_network("100::/64"),
    ipaddress.ip_network("2001::/23"),
    ipaddress.ip_network("fc00::/7"),            # Unique local
    ipaddress.ip_network("fe80::/10"),           # Link-local
    ipaddress.ip_network("ff00::/8"),            # Multicast
]

ALLOWED_SCHEMES = {"http", "https"}
ALLOWED_PORTS = {80, 443, 8080, 8443}
BLOCKED_HOSTNAMES = {
    "localhost", "broadcasthost", "ip6-localhost", "ip6-loopback",
    "metadata.google.internal", "metadata", "instance-data"
}

def is_ip_blocked(ip: ipaddress.IPv4Address or ipaddress.IPv6Address) -> bool:
    """Check if an IP address belongs to any blocked or non-public network."""
    # Check if IPv4-mapped IPv6
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped

    if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
        return True

    for net in BLOCKED_NETWORKS:
        try:
            if ip in net:
                return True
        except TypeError:
            continue
    return False

def validate_and_resolve_url(raw_url: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates a URL against SSRF attacks.
    Returns: (is_safe, error_message, sanitized_url)
    """
    if not raw_url or not isinstance(raw_url, str):
        return False, "URL is required and must be a string.", None

    clean_url = raw_url.strip()
    try:
        parsed = urlparse(clean_url)
    except Exception as e:
        return False, f"Invalid URL format: {str(e)}", None

    # If scheme was missing, default to https
    if not parsed.scheme:
        clean_url = f"https://{clean_url}"
        try:
            parsed = urlparse(clean_url)
        except Exception as e:
            return False, f"Invalid URL format: {str(e)}", None

    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        return False, f"Disallowed scheme '{parsed.scheme}'. Only HTTP and HTTPS are permitted.", None

    hostname = parsed.hostname
    if not hostname:
        return False, "URL does not contain a valid hostname.", None

    hostname_lower = hostname.lower().strip(".")
    if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith(".local") or hostname_lower.endswith(".internal"):
        return False, "This URL cannot be checked because it does not point to an allowed public website.", None

    port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    if port not in ALLOWED_PORTS:
        return False, f"Port {port} is not an allowed public web port.", None

    # Resolve IP addresses to prevent DNS rebinding or targeting private networks
    try:
        addr_info = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        return False, f"Could not resolve domain name: {str(e)}", None
    except Exception as e:
        return False, f"DNS resolution failed: {str(e)}", None

    if not addr_info:
        return False, "Domain did not resolve to any IP addresses.", None

    for entry in addr_info:
        sockaddr = entry[4]
        ip_str = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            if is_ip_blocked(ip_obj):
                return False, "This URL cannot be checked because it does not point to an allowed public website.", None
        except ValueError:
            return False, "Invalid IP address encountered during domain resolution.", None

    return True, None, clean_url
