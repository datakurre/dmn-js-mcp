/**
 * Centralised magic numbers and element-size constants for DMN.
 *
 * Keeps layout-related values in one place so changes propagate
 * consistently across all handlers that do positioning / spacing.
 */

/** Standard edge-to-edge gap in pixels between DRD elements. */
export const STANDARD_DMN_GAP = 50;

/**
 * Default DRD element sizes.
 *
 * These mirror the dmn-js defaults for each element category.
 * Source: dmn-js-drd/lib/features/modeling/DrdElementSizes.js
 */
export const ELEMENT_SIZES: Readonly<Record<string, { width: number; height: number }>> = {
  decision: { width: 180, height: 80 },
  inputData: { width: 125, height: 45 },
  businessKnowledgeModel: { width: 135, height: 46 },
  knowledgeSource: { width: 100, height: 63 },
  textAnnotation: { width: 100, height: 30 },
  default: { width: 180, height: 80 },
};

/**
 * ELK-specific spacing constants for DRD auto-layout.
 *
 * Tuned for DMN DRD diagrams which are typically wider and less
 * deeply nested than BPMN processes.
 */
export const ELK_LAYER_SPACING = 80;
export const ELK_NODE_SPACING = 60;
export const ELK_EDGE_NODE_SPACING = 15;

/** Look up the default size for a given DMN element type string. */
export function getElementSize(elementType: string): { width: number; height: number } {
  if (elementType === 'dmn:Decision') return ELEMENT_SIZES.decision;
  if (elementType === 'dmn:InputData') return ELEMENT_SIZES.inputData;
  if (elementType === 'dmn:BusinessKnowledgeModel') {
    return ELEMENT_SIZES.businessKnowledgeModel;
  }
  if (elementType === 'dmn:KnowledgeSource') return ELEMENT_SIZES.knowledgeSource;
  if (elementType === 'dmn:TextAnnotation') return ELEMENT_SIZES.textAnnotation;
  return ELEMENT_SIZES.default;
}
