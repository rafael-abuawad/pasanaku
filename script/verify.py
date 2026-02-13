from src import pasanaku as Pasanaku
from moccasin.config import get_active_network

ADDRESS = "0x530a4cBdC461181519E5459309411710e8C23EE6"


def verify():
    active_network = get_active_network()
    pasanaku_contract = Pasanaku.at(ADDRESS)
    result = active_network.moccasin_verify(pasanaku_contract)
    result.wait_for_verification()
    print(f"Verified {pasanaku_contract.address}")


def moccasin_main():
    verify()

