/**
 * Common query building utilities to reduce boilerplate in controllers
 */

/**
 * Build pagination parameters from request query
 * @param {string|number} page - Current page number
 * @param {string|number} limit - Items per page ('all' for no limit)
 * @param {number} total - Total document count
 * @param {number} defaultLimit - Default limit if none provided
 * @returns {Object} Pagination options: pageNum, limitNum, skip, and pagination result object
 */
export const buildPagination = (page = 1, limit, total, defaultLimit = 20) => {
    const pageNum = parseInt(page) || 1;
    const isAll = limit === 'all';
    const limitNum = isAll || limit === undefined ? undefined : parseInt(limit) || defaultLimit;

    const skip = limitNum !== undefined ? (pageNum - 1) * limitNum : 0;

    const paginationResult = {
        total,
        page: pageNum,
        pages: limitNum ? Math.ceil(total / limitNum) : 1,
    };

    if (limitNum !== undefined) {
        paginationResult.limit = limitNum;
    }

    return { pageNum, limitNum, skip, paginationResult };
};

/**
 * Build Mongoose sort object from sort string parameter
 * @param {string} sort - Sort parameter string (e.g., 'name_asc', 'price_desc')
 * @param {Object} defaultSort - Default sort object if param is missing/invalid
 * @returns {Object} Mongoose sort object
 */
export const buildSort = (sort, defaultSort = { createdAt: -1 }) => {
    if (!sort) return defaultSort;

    const sortOption = {};

    if (sort === 'price_asc' || sort === 'price-asc') sortOption.price = 1;
    else if (sort === 'price_desc' || sort === 'price-desc') sortOption.price = -1;
    else if (sort === 'rating') sortOption.rating = -1;
    else if (sort === 'name_asc' || sort === 'name-asc') sortOption.name = 1;
    else if (sort === 'name_desc' || sort === 'name-desc') sortOption.name = -1;
    else if (sort === 'email_asc' || sort === 'email-asc') sortOption.email = 1;
    else if (sort === 'email_desc' || sort === 'email-desc') sortOption.email = -1;
    else if (sort === 'newest') sortOption.createdAt = -1;
    else if (sort === 'oldest') sortOption.createdAt = 1;
    else return defaultSort;

    return sortOption;
};

/**
 * Build search query using $or on specified fields
 * @param {string} search - Search term
 * @param {Array<string>} fields - Array of field names to search in
 * @returns {Array<Object>|null} Array of $or conditions or null if no search term
 */
export const buildSearchQuery = (search, fields) => {
    if (!search || !fields || fields.length === 0) return null;

    return fields.map(field => ({
        [field]: { $regex: search, $options: 'i' }
    }));
};
