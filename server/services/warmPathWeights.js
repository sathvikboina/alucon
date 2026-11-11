// Heuristic edge weights for the warm-path finder.
//
// These are the only tunable numbers in the graph. A path score is the product
// of its two edge weights, so a stronger first hop plus a stronger second hop
// always beats a weaker combination. No model is involved.

const EDGE_WEIGHTS = Object.freeze({
  mentorship: 0.9,
  mutualFollow: 0.7,
  sameCompany: 0.6,
  oneWayFollow: 0.5,
  sharedGroup: 0.4,
});

const MAX_PATH_DEPTH = 2;
const MAX_PATHS = 3;
const FALLBACK_GROUP_LIMIT = 3;

module.exports = {
  EDGE_WEIGHTS,
  MAX_PATH_DEPTH,
  MAX_PATHS,
  FALLBACK_GROUP_LIMIT,
};
