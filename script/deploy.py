from src import pasanaku as Pasanaku
from moccasin.boa_tools import VyperContract


def deploy() -> VyperContract:
    base_uri: str = "https://pasanaku.com/api/v1/token/"
    pasanaku: VyperContract = Pasanaku.deploy(base_uri)
    return pasanaku


def moccasin_main() -> VyperContract:
    return deploy()
