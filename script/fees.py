from src import pasanaku as Pasanaku

ADDRESS = "0x530a4cBdC461181519E5459309411710e8C23EE6"


def collect_protocol_fees():
    pasanaku_contract = Pasanaku.at(ADDRESS)
    pasanaku_contract.collect_protocol_fees()


def moccasin_main():
    collect_protocol_fees()
