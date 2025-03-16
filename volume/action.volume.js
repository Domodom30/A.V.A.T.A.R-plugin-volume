import { default as _helpers } from '../../ia/node_modules/ava-ia/helpers/index.js';

export default async function (state) {
  return new Promise(async (resolve) => {
    let volume = parseFloat(state.tokens.find((token) => isFinite(token)));

    setTimeout(() => {
      state.action = {
        module: 'volume',
        command: state.rule,
        volume: volume,
      };
      resolve(state);
    }, Config.waitAction.time);
  });
}
