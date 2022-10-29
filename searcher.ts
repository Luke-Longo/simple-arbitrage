import "./helpers/server";
import { initiateListeners as initiateListenersAave } from "./src/listenAave";
import { listenSwaps } from "./src/listenSwaps";

// need the aave smart contracts to add the listeners to

const main = async () => {
	// add other listeners here
	await initiateListenersAave();
	await listenSwaps();
};

main();
