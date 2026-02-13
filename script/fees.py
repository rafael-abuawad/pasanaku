from src import pasanaku as Pasanaku

ADDRESS = "0x1886f4a411c195BC36fA347641b527d381f08E3A"


def collect_protocol_fees():
    pasanaku_contract = Pasanaku.at(ADDRESS)
    pasanaku_contract.collect_protocol_fees()


def moccasin_main():
    collect_protocol_fees()
