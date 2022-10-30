import * as _ from "lodash";
import { BigNumber, Contract, Wallet } from "ethers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import { WETH_ADDRESS } from "./addresses";
import { EthMarket } from "./EthMarket";
import { ETHER, bigNumberToDecimal } from "./utils";

export interface CrossedMarketDetails {
	profit: BigNumber;
	volume: BigNumber;
	tokenAddress: string;
	buyFromMarket: EthMarket;
	sellToMarket: EthMarket;
}

export type MarketsByToken = { [tokenAddress: string]: Array<EthMarket> };

// TODO: implement binary search (assuming linear/exponential global maximum profitability)
const TEST_VOLUMES = [
	ETHER.div(100),
	ETHER.div(10),
	ETHER.div(6),
	ETHER.div(4),
	ETHER.div(2),
	ETHER.div(1),
	ETHER.mul(2),
	ETHER.mul(5),
	ETHER.mul(10),
];

export function getBestCrossedMarket(
	crossedMarkets: Array<EthMarket>[],
	tokenAddress: string
): CrossedMarketDetails | undefined {
	let bestCrossedMarket: CrossedMarketDetails | undefined = undefined;

	for (const crossedMarket of crossedMarkets) {
		// sellToMarket will be selling WETH to market 0 from arbitrary token
		const sellToMarket = crossedMarket[0];
		// buyFromMarket will be buying WETH from market 1 with the arbitrary token
		const buyFromMarket = crossedMarket[1];
		// test volumes i am guessing is the volume of the token that is being sold/bought, attempting to factor in fees and slippage
		for (const size of TEST_VOLUMES) {
			// returns the amountOut from the buying size
			const tokensOutFromBuyingSize = buyFromMarket.getTokensOut(
				WETH_ADDRESS,
				tokenAddress,
				size
			);
			// use the amountsOut from the buyingSize as the amountIn on the selling market to get the amount of WETH that will be received
			const proceedsFromSellingTokens = sellToMarket.getTokensOut(
				tokenAddress,
				WETH_ADDRESS,
				tokensOutFromBuyingSize
			);

			const profit = proceedsFromSellingTokens.sub(size);
			// this does not come to play on the first iteration of the loop that is why it is initially set to undefined, however after the first iteration it will come into play
			// check if the profit is less than the bestCrossedMarket.profit
			if (bestCrossedMarket !== undefined && profit.lt(bestCrossedMarket.profit)) {
				// If the next size up lost value, meet halfway. TODO: replace with real binary search
				const trySize = size.add(bestCrossedMarket.volume).div(2);
				const tryTokensOutFromBuyingSize = buyFromMarket.getTokensOut(
					WETH_ADDRESS,
					tokenAddress,
					trySize
				);
				const tryProceedsFromSellingTokens = sellToMarket.getTokensOut(
					tokenAddress,
					WETH_ADDRESS,
					tryTokensOutFromBuyingSize
				);
				const tryProfit = tryProceedsFromSellingTokens.sub(trySize);
				if (tryProfit.gt(bestCrossedMarket.profit)) {
					bestCrossedMarket = {
						volume: trySize,
						profit: tryProfit,
						tokenAddress,
						sellToMarket,
						buyFromMarket,
					};
				}
				break;
			}
			bestCrossedMarket = {
				volume: size,
				profit: profit,
				tokenAddress,
				sellToMarket,
				buyFromMarket,
			};
		}
	}
	return bestCrossedMarket;
}

export class Arbitrage {
	private flashbotsProvider: FlashbotsBundleProvider;
	private bundleExecutorContract: Contract;
	private executorWallet: Wallet;

	constructor(
		executorWallet: Wallet,
		flashbotsProvider: FlashbotsBundleProvider,
		bundleExecutorContract: Contract
	) {
		this.executorWallet = executorWallet;
		this.flashbotsProvider = flashbotsProvider;
		this.bundleExecutorContract = bundleExecutorContract;
	}

	static printCrossedMarket(crossedMarket: CrossedMarketDetails): void {
		const buyTokens = crossedMarket.buyFromMarket.tokens;
		const sellTokens = crossedMarket.sellToMarket.tokens;
		console.log(
			`Profit: ${bigNumberToDecimal(
				crossedMarket.profit
			)} Volume: ${bigNumberToDecimal(crossedMarket.volume)}\n` +
				`${crossedMarket.buyFromMarket.protocol} (${crossedMarket.buyFromMarket.marketAddress})\n` +
				`  ${buyTokens[0]} => ${buyTokens[1]}\n` +
				`${crossedMarket.sellToMarket.protocol} (${crossedMarket.sellToMarket.marketAddress})\n` +
				`  ${sellTokens[0]} => ${sellTokens[1]}\n` +
				`\n`
		);
	}

	async evaluateMarkets(
		marketsByToken: MarketsByToken
	): Promise<Array<CrossedMarketDetails>> {
		const bestCrossedMarkets = new Array<CrossedMarketDetails>();

		// for each token address in marketsByToken object
		for (const tokenAddress in marketsByToken) {
			// we will set the markets to be equal to the array of ethMarkets inside the marketsByToken object
			const markets = marketsByToken[tokenAddress];
			// now we will a new array of pricedMarkets where we will have the ethMarket itself, the buyTokenPrice, and the sellTokenPrice
			const pricedMarkets = _.map(markets, (ethMarket: EthMarket) => {
				return {
					ethMarket: ethMarket,
					// getTokensIn returns the amount of tokens needed to get out the amount of WETH = ETHER.div(100)
					buyTokenPrice: ethMarket.getTokensIn(
						tokenAddress,
						WETH_ADDRESS,
						ETHER.div(100)
					),
					// getTokensOut returns the amount of tokens you get from the amount of WETH = ETHER.div(100)
					sellTokenPrice: ethMarket.getTokensOut(
						WETH_ADDRESS,
						tokenAddress,
						ETHER.div(100)
					),
				};
			});

			// now that you have the priced markets you will want to compare the price within each market to see if you can sell the token for a higher price than you are buying it for
			// crossedMarkets will be an array of arrays of ethMarkets [
			// 	[ethMarket1, ethMarket2],
			// 	[ethMarket1, ethMarket3],
			// 	[ethMarket2, ethMarket3]
			// ]
			const crossedMarkets = new Array<Array<EthMarket>>();
			// for each pricedMarket in pricedMarkets
			for (const pricedMarket of pricedMarkets) {
				// going to search through the pricedMarkets array to see if there is a market that has a higher sellTokenPrice than the current pricedMarket
				_.forEach(pricedMarkets, (pm) => {
					// remember sellTokenPrice returns the amount of arb tokens you get from the amount of WETH = ETHER.div(100)
					if (pm.sellTokenPrice.gt(pricedMarket.buyTokenPrice)) {
						// crossedMarket will have the first index be the pricedMarket where you are buying from and the second index be the pricedMarket where you are selling to, ie buy usdc from market 1, sell usdc for more WETH on market 2
						crossedMarkets.push([pricedMarket.ethMarket, pm.ethMarket]);
					}
				});
			}

			// Once you have all the crossedMarkets you will want to find the bestCrossedMarket
			const bestCrossedMarket = getBestCrossedMarket(crossedMarkets, tokenAddress);
			if (
				bestCrossedMarket !== undefined &&
				bestCrossedMarket.profit.gt(ETHER.div(1000))
			) {
				bestCrossedMarkets.push(bestCrossedMarket);
			}
		}
		bestCrossedMarkets.sort((a, b) =>
			a.profit.lt(b.profit) ? 1 : a.profit.gt(b.profit) ? -1 : 0
		);
		return bestCrossedMarkets;
	}

	// TODO: take more than 1
	async takeCrossedMarkets(
		bestCrossedMarkets: CrossedMarketDetails[],
		blockNumber: number,
		minerRewardPercentage: number
	): Promise<void> {
		for (const bestCrossedMarket of bestCrossedMarkets) {
			console.log(
				"Send this much WETH",
				bestCrossedMarket.volume.toString(),
				"get this much profit",
				bestCrossedMarket.profit.toString()
			);
			const buyCalls =
				await bestCrossedMarket.buyFromMarket.sellTokensToNextMarket(
					WETH_ADDRESS,
					bestCrossedMarket.volume,
					bestCrossedMarket.sellToMarket
				);
			const inter = bestCrossedMarket.buyFromMarket.getTokensOut(
				WETH_ADDRESS,
				bestCrossedMarket.tokenAddress,
				bestCrossedMarket.volume
			);
			const sellCallData = await bestCrossedMarket.sellToMarket.sellTokens(
				bestCrossedMarket.tokenAddress,
				inter,
				this.bundleExecutorContract.address
			);

			const targets: Array<string> = [
				...buyCalls.targets,
				bestCrossedMarket.sellToMarket.marketAddress,
			];
			const payloads: Array<string> = [...buyCalls.data, sellCallData];
			console.log({ targets, payloads });
			const minerReward = bestCrossedMarket.profit
				.mul(minerRewardPercentage)
				.div(100);
			const transaction =
				await this.bundleExecutorContract.populateTransaction.uniswapWeth(
					bestCrossedMarket.volume,
					minerReward,
					targets,
					payloads,
					{
						gasPrice: BigNumber.from(0),
						gasLimit: BigNumber.from(1000000),
					}
				);

			try {
				const estimateGas = await this.bundleExecutorContract.provider.estimateGas({
					...transaction,
					from: this.executorWallet.address,
				});
				if (estimateGas.gt(1400000)) {
					console.log(
						"EstimateGas succeeded, but suspiciously large: " + estimateGas.toString()
					);
					continue;
				}
				transaction.gasLimit = estimateGas.mul(2);
			} catch (e) {
				console.warn(
					`Estimate gas failure for ${JSON.stringify(bestCrossedMarket)}`
				);
				continue;
			}
			const bundledTransactions = [
				{
					signer: this.executorWallet,
					transaction: transaction,
				},
			];
			console.log(bundledTransactions);
			const signedBundle = await this.flashbotsProvider.signBundle(
				bundledTransactions
			);
			//
			const simulation = await this.flashbotsProvider.simulate(
				signedBundle,
				blockNumber + 1
			);
			if ("error" in simulation || simulation.firstRevert !== undefined) {
				console.log(
					`Simulation Error on token ${bestCrossedMarket.tokenAddress}, skipping`
				);
				continue;
			}
			console.log(
				`Submitting bundle, profit sent to miner: ${bigNumberToDecimal(
					simulation.coinbaseDiff
				)}, effective gas price: ${bigNumberToDecimal(
					simulation.coinbaseDiff.div(simulation.totalGasUsed),
					9
				)} GWEI`
			);
			const bundlePromises = _.map(
				[blockNumber + 1, blockNumber + 2],
				(targetBlockNumber) =>
					this.flashbotsProvider.sendRawBundle(signedBundle, targetBlockNumber)
			);
			await Promise.all(bundlePromises);
			return;
		}
		throw new Error("No arbitrage submitted to relay");
	}
}
