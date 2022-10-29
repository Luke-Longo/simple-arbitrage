import * as dotenv from "dotenv";
import { ethers } from "ethers";
import {
	LENDING_POOL_V3_ABI,
	LENDING_POOL_PROVIDER_V3_ABI,
	LENDING_POOL_PROVIDER_V2_ABI,
	LENDING_POOL_V2_ABI,
} from "./abi";
import {
	LENDING_POOL_PROVIDER_V2_MAINNET_ADDRESS,
	LENDING_POOL_PROVIDER_V3_POLYGON_ADDRESS,
} from "./addresses";

dotenv.config();

const providerPolygon = new ethers.providers.JsonRpcProvider(
	process.env.POLYGON_RPC_URL
);

const providerEthereum = new ethers.providers.JsonRpcProvider(
	process.env.ETHEREUM_RPC_URL
);

const lendingPoolAddressProviderPolygon = new ethers.Contract(
	LENDING_POOL_PROVIDER_V3_POLYGON_ADDRESS,
	LENDING_POOL_PROVIDER_V3_ABI,
	providerPolygon
);

const lendingPoolAddressProviderEthereum = new ethers.Contract(
	LENDING_POOL_PROVIDER_V2_MAINNET_ADDRESS,
	LENDING_POOL_PROVIDER_V2_ABI,
	providerEthereum
);

export const initiateListeners = async () => {
	const lendingPoolAddressPolygon =
		await lendingPoolAddressProviderPolygon.getPool();

	const lendingPoolAddressEthereum =
		await lendingPoolAddressProviderEthereum.getLendingPool();

	if (lendingPoolAddressPolygon) {
		const lendingPool = new ethers.Contract(
			lendingPoolAddressPolygon,
			LENDING_POOL_V3_ABI,
			providerPolygon
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
				console.log("LiquidationCallV3Polygon");
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
		lendingPool.on("Borrow", () => {
			console.log("BorrowV3Polygon");
		});
		lendingPool.on("Supply", () => {
			console.log("SupplyV3Polygon");
		});
	}

	if (lendingPoolAddressEthereum) {
		const lendingPool = await new ethers.Contract(
			lendingPoolAddressEthereum,
			LENDING_POOL_V2_ABI,
			providerEthereum
		);
		lendingPool.on("Borrow", () => {
			console.log("BorrowV2Ethereum");
		});
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
				console.log("LiquidationCallV2Ethereum");
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
		lendingPool.on("Deposit", () => {
			console.log("DepositV2Ethereum");
		});
		lendingPool.on("Withdraw", () => {
			console.log("WithdrawV2Ethereum");
		});
	}
};
