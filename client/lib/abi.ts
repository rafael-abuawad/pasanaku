import { erc20Abi as standardErc20Abi } from "viem";

export const erc20Abi = [
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "faucet",
		inputs: [
			{
				name: "to",
				type: "address",
			},
			{
				name: "amount",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	...standardErc20Abi,
] as const;

export const pasanakuAbi = [
	{
		name: "RotatingSavingsCreated",
		inputs: [
			{
				name: "players",
				type: "address[]",
				indexed: false,
			},
			{
				name: "asset",
				type: "address",
				indexed: true,
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
			},
			{
				name: "player_count",
				type: "uint256",
				indexed: false,
			},
			{
				name: "creator",
				type: "address",
				indexed: true,
			},
			{
				name: "token_id",
				type: "uint256",
				indexed: true,
			},
			{
				name: "created_at",
				type: "uint256",
				indexed: false,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "Deposited",
		inputs: [
			{
				name: "player",
				type: "address",
				indexed: true,
			},
			{
				name: "token_id",
				type: "uint256",
				indexed: true,
			},
			{
				name: "index",
				type: "uint256",
				indexed: false,
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
			},
			{
				name: "total_deposited",
				type: "uint256",
				indexed: false,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "Claimed",
		inputs: [
			{
				name: "player",
				type: "address",
				indexed: true,
			},
			{
				name: "token_id",
				type: "uint256",
				indexed: true,
			},
			{
				name: "index",
				type: "uint256",
				indexed: false,
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
			},
			{
				name: "total_deposited",
				type: "uint256",
				indexed: false,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "Ended",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
				indexed: true,
			},
			{
				name: "last_updated_at",
				type: "uint256",
				indexed: false,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "Recovered",
		inputs: [
			{
				name: "player",
				type: "address",
				indexed: true,
			},
			{
				name: "token_id",
				type: "uint256",
				indexed: true,
			},
			{
				name: "index",
				type: "uint256",
				indexed: false,
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "OwnershipTransferred",
		inputs: [
			{
				name: "previous_owner",
				type: "address",
				indexed: true,
			},
			{
				name: "new_owner",
				type: "address",
				indexed: true,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "RoleMinterChanged",
		inputs: [
			{
				name: "minter",
				type: "address",
				indexed: true,
			},
			{
				name: "status",
				type: "bool",
				indexed: false,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "TransferSingle",
		inputs: [
			{
				name: "_operator",
				type: "address",
				indexed: true,
			},
			{
				name: "_from",
				type: "address",
				indexed: true,
			},
			{
				name: "_to",
				type: "address",
				indexed: true,
			},
			{
				name: "_id",
				type: "uint256",
				indexed: false,
			},
			{
				name: "_value",
				type: "uint256",
				indexed: false,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "TransferBatch",
		inputs: [
			{
				name: "_operator",
				type: "address",
				indexed: true,
			},
			{
				name: "_from",
				type: "address",
				indexed: true,
			},
			{
				name: "_to",
				type: "address",
				indexed: true,
			},
			{
				name: "_ids",
				type: "uint256[]",
				indexed: false,
			},
			{
				name: "_values",
				type: "uint256[]",
				indexed: false,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "ApprovalForAll",
		inputs: [
			{
				name: "_owner",
				type: "address",
				indexed: true,
			},
			{
				name: "_operator",
				type: "address",
				indexed: true,
			},
			{
				name: "_approved",
				type: "bool",
				indexed: false,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		name: "URI",
		inputs: [
			{
				name: "_value",
				type: "string",
				indexed: false,
			},
			{
				name: "_id",
				type: "uint256",
				indexed: true,
			},
		],
		anonymous: false,
		type: "event",
	},
	{
		stateMutability: "view",
		type: "function",
		name: "owner",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "supportsInterface",
		inputs: [
			{
				name: "interface_id",
				type: "bytes4",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "safeTransferFrom",
		inputs: [
			{
				name: "owner",
				type: "address",
			},
			{
				name: "to",
				type: "address",
			},
			{
				name: "id",
				type: "uint256",
			},
			{
				name: "amount",
				type: "uint256",
			},
			{
				name: "data",
				type: "bytes",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "safeBatchTransferFrom",
		inputs: [
			{
				name: "owner",
				type: "address",
			},
			{
				name: "to",
				type: "address",
			},
			{
				name: "ids",
				type: "uint256[]",
			},
			{
				name: "amounts",
				type: "uint256[]",
			},
			{
				name: "data",
				type: "bytes",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "balanceOfBatch",
		inputs: [
			{
				name: "owners",
				type: "address[]",
			},
			{
				name: "ids",
				type: "uint256[]",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256[]",
			},
		],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "setApprovalForAll",
		inputs: [
			{
				name: "operator",
				type: "address",
			},
			{
				name: "approved",
				type: "bool",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "uri",
		inputs: [
			{
				name: "id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "string",
			},
		],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "set_uri",
		inputs: [
			{
				name: "id",
				type: "uint256",
			},
			{
				name: "token_uri",
				type: "string",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "exists",
		inputs: [
			{
				name: "id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "burn",
		inputs: [
			{
				name: "owner",
				type: "address",
			},
			{
				name: "id",
				type: "uint256",
			},
			{
				name: "amount",
				type: "uint256",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "burn_batch",
		inputs: [
			{
				name: "owner",
				type: "address",
			},
			{
				name: "ids",
				type: "uint256[]",
			},
			{
				name: "amounts",
				type: "uint256[]",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "safe_mint",
		inputs: [
			{
				name: "owner",
				type: "address",
			},
			{
				name: "id",
				type: "uint256",
			},
			{
				name: "amount",
				type: "uint256",
			},
			{
				name: "data",
				type: "bytes",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "safe_mint_batch",
		inputs: [
			{
				name: "owner",
				type: "address",
			},
			{
				name: "ids",
				type: "uint256[]",
			},
			{
				name: "amounts",
				type: "uint256[]",
			},
			{
				name: "data",
				type: "bytes",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "set_minter",
		inputs: [
			{
				name: "minter",
				type: "address",
			},
			{
				name: "status",
				type: "bool",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "transfer_ownership",
		inputs: [
			{
				name: "new_owner",
				type: "address",
			},
		],
		outputs: [],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "renounce_ownership",
		inputs: [],
		outputs: [],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "balanceOf",
		inputs: [
			{
				name: "arg0",
				type: "address",
			},
			{
				name: "arg1",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "isApprovedForAll",
		inputs: [
			{
				name: "arg0",
				type: "address",
			},
			{
				name: "arg1",
				type: "address",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "total_supply",
		inputs: [
			{
				name: "arg0",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "is_minter",
		inputs: [
			{
				name: "arg0",
				type: "address",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "payable",
		type: "function",
		name: "create",
		inputs: [
			{
				name: "asset",
				type: "address",
			},
			{
				name: "players",
				type: "address[]",
			},
			{
				name: "amount",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "payable",
		type: "function",
		name: "deposit",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "payable",
		type: "function",
		name: "claim",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "nonpayable",
		type: "function",
		name: "recover",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "rotating_savings",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "tuple",
				components: [
					{
						name: "players",
						type: "address[]",
					},
					{
						name: "asset",
						type: "address",
					},
					{
						name: "amount",
						type: "uint256",
					},
					{
						name: "player_count",
						type: "uint256",
					},
					{
						name: "current_player_index",
						type: "uint256",
					},
					{
						name: "creator",
						type: "address",
					},
					{
						name: "total_deposited",
						type: "uint256",
					},
					{
						name: "token_id",
						type: "uint256",
					},
					{
						name: "ended",
						type: "bool",
					},
					{
						name: "created_at",
						type: "uint256",
					},
					{
						name: "last_updated_at",
						type: "uint256",
					},
				],
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "total_deposited",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "can_be_recovered",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "can_be_claimed",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "current_player",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "address",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "player_count",
		inputs: [
			{
				name: "token_id",
				type: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
			},
		],
	},
	{
		stateMutability: "pure",
		type: "function",
		name: "protocol_fee",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "supported_assets",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address[5]",
			},
		],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "has_deposited",
		inputs: [
			{ name: "account", type: "address" },
			{ name: "token_id", type: "uint256" },
			{ name: "index", type: "uint256" },
		],
		outputs: [{ name: "", type: "bool" }],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "can_current_recipient_claim",
		inputs: [{ name: "token_id", type: "uint256" }],
		outputs: [{ name: "", type: "bool" }],
	},
	{
		stateMutability: "view",
		type: "function",
		name: "next_token_id",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		stateMutability: "payable",
		type: "constructor",
		inputs: [
			{
				name: "base_uri_",
				type: "string",
			},
			{
				name: "supported_assets",
				type: "address[5]",
			},
		],
		outputs: [],
	},
] as const;
