import { default as _helpers } from '../../ia/node_modules/ava-ia/helpers/index.js';

export default async function (state, actions) {
  const dataVolume = parseFloat(state.tokens.find((token) => isFinite(token)));
  // exits if the rule is already verified
  if (state.isIntent) return (0, _helpers.resolve)(state);

  // checks the plugin rules
  for (var rule in Config.modules.volume.rules) {
    var match = (0, _helpers.syntax)(state.sentence, Config.modules.volume.rules[rule]);
    if (match) break;
  }

  if (match) {
    state.isIntent = true;
    state.rule = rule;
    state.volume = dataVolume;
    return (0, _helpers.factoryActions)(state, actions);
  } else return (0, _helpers.resolve)(state);
}
