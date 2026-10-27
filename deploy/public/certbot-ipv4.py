#!/usr/bin/python3
"""Prefer the verified working IPv4 transport ONLY inside the ACME client."""
import socket

from urllib3.util import connection
from certbot.main import main

connection.allowed_gai_family = lambda: socket.AF_INET
raise SystemExit(main())
