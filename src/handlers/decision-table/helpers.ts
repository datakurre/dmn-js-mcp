/**
 * Shared helpers for decision-table handler modules.
 */

import { typeMismatchError } from '../../errors';

/**
 * Retrieve the DecisionTable business object from a DRD element,
 * throwing a typed error if the element is not a Decision or has
 * no DecisionTable logic.
 *
 * @returns The `dmn:DecisionTable` business object.
 */
export function requireDecisionTable(bo: any, decisionId: string): any {
  if (bo.$type !== 'dmn:Decision') {
    throw typeMismatchError(decisionId, bo.$type, ['dmn:Decision']);
  }
  const logic = bo.decisionLogic;
  if (!logic || logic.$type !== 'dmn:DecisionTable') {
    throw typeMismatchError(decisionId, logic?.$type || 'none', ['dmn:DecisionTable']);
  }
  return logic;
}
