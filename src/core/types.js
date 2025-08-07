// Plain JS typedefs via JSDoc for editor IntelliSense

/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Size
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} TitleElement
 * @property {string} id
 * @property {'title'} type
 * @property {string} content
 * @property {Position} position
 * @property {Size} size
 */

/**
 * @typedef {Object} ContentElement
 * @property {string} id
 * @property {'content'} type
 * @property {string[]} content
 * @property {Position} position
 * @property {Size} size
 */

/**
 * @typedef {Object} ImageSuggestionElement
 * @property {string} id
 * @property {'image_suggestion'} type
 * @property {string} content
 */

/**
 * @typedef {Object} DiagramElement
 * @property {string} id
 * @property {'diagram'} type
 * @property {string} content
 * @property {'mermaid'|'plantuml'|'d2'|'graphviz'} [syntax]
 * @property {Position} position
 * @property {Size} size
 */

/**
 * @typedef {Object} Slide
 * @property {string|number} id
 * @property {(TitleElement|ContentElement|ImageSuggestionElement|DiagramElement)[]} elements
 * @property {string} [notes]
 * @property {number} order
 * @property {string|null} [image_url]
 * @property {string|number} [presentation_id]
 */

