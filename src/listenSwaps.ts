// import * as dotenv from "dotenv";
// import { ethers } from "ethers";
// import { UNISWAP_FACTORY_V2_ABI, UNISWAP_ROUTER_V2_ABI } from "./abi";
// import {
// 	UNISWAP_FACTORY_V2_ADDRESS,
// 	SUSHISWAP_FACTORY_V2_ADDRESS,
// 	SUSHISWAP_V2_ROUTER_02_ADDRESS,
// 	UNISWAP_V2_ROUTER_02_ADDRESS,
// } from "./addresses";

// dotenv.config();

// const providerEthereum = new ethers.providers.JsonRpcProvider(
// 	process.env.ETHEREUM_RPC_URL
// );
// export const uFactory = new ethers.Contract(
// 	UNISWAP_FACTORY_V2_ADDRESS,
// 	UNISWAP_FACTORY_V2_ABI,
// 	providerEthereum
// ); // UNISWAP FACTORY CONTRACT

// export const uRouter = new ethers.Contract(
// 	UNISWAP_V2_ROUTER_02_ADDRESS,
// 	UNISWAP_ROUTER_V2_ABI,
// 	providerEthereum
// ); // UNISWAP ROUTER CONTRACT

// export const sFactory = new ethers.Contract(
// 	SUSHISWAP_FACTORY_V2_ADDRESS,
// 	UNISWAP_FACTORY_V2_ABI,
// 	providerEthereum
// ); // SUSHISWAP FACTORY CONTRACT

// export const sRouter = new ethers.Contract(
// 	SUSHISWAP_V2_ROUTER_02_ADDRESS,
// 	UNISWAP_ROUTER_V2_ABI,
// 	providerEthereum
// ); // SUSHISWAP ROUTER CONTRACT

export const listenSwaps = () => {
	console.log("Listening for swaps...");
};
