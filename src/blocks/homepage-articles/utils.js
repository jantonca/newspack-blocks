/**
 * External dependencies
 */
import { isEqual, isUndefined, pick, pickBy } from 'lodash';

/**
 * Based global WP.com blog_public option, checks whether current blog is
 * private or not.
 *
 * @return {boolean} a private WP.com blog flag
 */
export const isBlogPrivate = () =>
	typeof window === 'object' &&
	window.wpcomGutenberg &&
	Number( window.wpcomGutenberg.blogPublic ) === -1;

/**
 * Block attributes which influence posts query
 */
const POST_QUERY_ATTRIBUTES = [
	'postsToShow',
	'authors',
	'categories',
	'tags',
	'specificPosts',
	'specificMode',
	'tagExclusions',
	'postType',
];

/**
 * Does the props change necessitate a reflow?
 * A reflow should happen if:
 * 1. Query-changing attributes of a block change
 * 2. The top-level blocks order changes. A Homepage Articles
 *    block might be nested somewhere.
 *
 * @param {Object} prevProps Edit component props
 * @param {Object} props Edit component props
 */
export const shouldReflow = ( prevProps, props ) =>
	! isEqual(
		pick( prevProps.attributes, POST_QUERY_ATTRIBUTES ),
		pick( props.attributes, POST_QUERY_ATTRIBUTES )
	) || ! isEqual( prevProps.topBlocksClientIdsInOrder, props.topBlocksClientIdsInOrder );

/**
 * Builds query criteria from given attributes.
 *
 * @param {Object} attributes block attributes
 * @return {Object} criteria
 */
export const queryCriteriaFromAttributes = attributes => {
	const {
		postsToShow,
		authors,
		categories,
		postType,
		tags,
		specificPosts,
		specificMode,
		tagExclusions,
	} = pick( attributes, POST_QUERY_ATTRIBUTES );

	const cleanPosts = sanitizePostList( specificPosts );
	const isSpecificPostModeActive = specificMode && cleanPosts && cleanPosts.length;
	const postTypeArray = Object.keys( postType ).reduce(
		( acc, slug ) => ( postType[ slug ] ? [ ...acc, slug ] : acc ),
		[]
	);
	const criteria = pickBy(
		isSpecificPostModeActive
			? {
					include: cleanPosts,
					orderby: 'include',
					per_page: specificPosts.length,
					post_type: postTypeArray,
			  }
			: {
					per_page: postsToShow,
					categories,
					author: authors,
					tags,
					tags_exclude: tagExclusions,
					post_type: postTypeArray,
			  },
		value => ! isUndefined( value )
	);
	criteria.suppress_password_protected_posts = true;
	return criteria;
};

export const sanitizePostList = postList =>
	postList.map( id => parseInt( id ) ).filter( id => id > 0 );

export const getBlockQueries = ( blocks, blockName ) =>
	blocks.flatMap( block => {
		const homepageArticleBlocks = [];
		if ( block.name === blockName ) {
			const postsQuery = queryCriteriaFromAttributes( block.attributes );
			homepageArticleBlocks.push( { postsQuery, clientId: block.clientId } );
		}
		return homepageArticleBlocks.concat( getBlockQueries( block.innerBlocks, blockName ) );
	} );

export const getEditorBlocksIds = blocks =>
	blocks.flatMap( block => {
		const homepageArticleBlocks = [];
		homepageArticleBlocks.push( block.clientId );
		return homepageArticleBlocks.concat( getEditorBlocksIds( block.innerBlocks ) );
	} );
