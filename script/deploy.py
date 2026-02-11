from src import pasanaku as Pasanaku
from moccasin.boa_tools import VyperContract

SUPPORTED_ASSETS = [
    "0xd24Eab8A12c6d42d4614493Eb2F3F9aD34b1CF5F",
    "0xE0FB0F453aBfbd74368074cf0291711FC82cBc07",
    "0x1c97C5715F20445400716DB9b1EA2e82F873cF35",
]


def deploy() -> VyperContract:
    base_uri: str = "https://pasanaku.com/api/v1/token/"
    pasanaku: VyperContract = Pasanaku.deploy(base_uri, SUPPORTED_ASSETS)
    return pasanaku


def moccasin_main() -> VyperContract:
    return deploy()
