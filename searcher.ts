import "./helpers/server";
import * as dotenv from "dotenv";
import { ethers } from "ethers";
import {
	AAVE_LENDING_POOL_ABI,
	AAVE_LENDING_POOL_ADDRESS_PROVIDER_ABI,
} from "./utils/abi";
import { AAVE_LENDING_POOL_PROVIDER_ADDRESS } from "./utils/addresses";

dotenv.config();

// need the aave smart contracts to add the listeners to

const main = async () => {
	const provider = new ethers.providers.JsonRpcProvider(
		process.env.POLYGON_RPC_URL
	);

	const lendingPoolAddressProvider = new ethers.Contract(
		AAVE_LENDING_POOL_PROVIDER_ADDRESS,
		AAVE_LENDING_POOL_ADDRESS_PROVIDER_ABI,
		provider
	);

	const lendingPoolAddress = await lendingPoolAddressProvider.getPool();
	console.log(lendingPoolAddress);

	if (lendingPoolAddress) {
		const lendingPool = new ethers.Contract(
			lendingPoolAddress,
			AAVE_LENDING_POOL_ABI,
			provider
		);
		lendingPool.on(
			"LiquidationCall",
			(
				_collateral,
				_reserve,
				_user,
				_purchasedAmount,
				_liquidatedCollateralAmount,
				_accruedBorrowInterest,
				_liquidator,
				_receiveAToken,
				_timestamp
			) => {
				console.log("LiquidationCall");
				console.log(`_collateral: ${_collateral}`);
				console.log(`_reserve: ${_reserve}`);
				console.log(`_user: ${_user}`);
				console.log(`_purchasedAmount: ${_purchasedAmount}`);
				console.log(`_liquidatedCollateralAmount: ${_liquidatedCollateralAmount}`);
				console.log(`_accruedBorrowInterest: ${_accruedBorrowInterest}`);
				console.log(`_liquidator: ${_liquidator}`);
				console.log(`_receiveAToken: ${_receiveAToken}`);
				console.log(`_timestamp: ${_timestamp}`);
			}
		);
	}
};

main();
