"""Synthetic cross-language vectors only; input through a pipe, never CLI secrets."""
import json
import sys

from terminal.protocol import hash_card, receipt, request_headers

value = json.load(sys.stdin)
print(json.dumps({
    "cardHash": hash_card(value["uid"], value["config"]["rfidPepper"]),
    "receipt": receipt(value["config"], value["event"]),
    "headers": request_headers(value["config"], value["path"], value["body"].encode(),
                               value["timestamp"], value["nonce"])
}))
