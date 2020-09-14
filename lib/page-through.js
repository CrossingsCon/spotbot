export async function pageThrough(fn, key) {
  let results = [];

  let nextCursor = '';
  do {
    const pageOfResults = await fn(nextCursor);
    results = [...results, ...pageOfResults[key]];
    nextCursor = pageOfResults.response_metadata.next_cursor;
  } while(nextCursor !== '')

  return results;
}
