// Turns PostgreSQL errors into messages a user can understand.
// Every constraint in researchtrail.sql has a matching message here, so the
// database itself is the final check on the data (database-level validation).

const CONSTRAINT_MESSAGES = {
  sources_title_check: "Title cannot be blank.",
  sources_url_check: "URL must start with http:// or https://",
  sources_type_check: "Type must be paper, article, dataset, website, video or book.",
  sources_publication_year_check: "Publication year must be between 1450 and 2100.",
  sources_time_spent_min_check: "Time spent cannot be negative.",
  sources_check: "A source cannot be its own parent.",
  sources_project_id_url_key: "This URL is already saved in this project.",
  citations_check: "A source cannot cite itself.",
  tags_name_check: "Tags must be lowercase.",
};

// Returns { status, message } for a known database error, or null for anything else
export function friendlyDbError(error) {
  if (error.constraint && CONSTRAINT_MESSAGES[error.constraint]) {
    return { status: 400, message: CONSTRAINT_MESSAGES[error.constraint] };
  }
  switch (error.code) {
    case "P0001": // RAISE EXCEPTION in a trigger, e.g. "Parent source 1 is not in project 2"
      return { status: 400, message: error.message };
    case "23505": // unique violation
      return { status: 409, message: "That already exists." };
    case "23514": // other CHECK constraint
      return { status: 400, message: "Some of the values are not allowed." };
    case "23503": // foreign key violation
      return { status: 400, message: "A linked item no longer exists." };
    case "22001": // value too long for the column
      return { status: 400, message: "One of the fields is too long." };
    case "22P02": // not a valid number
      return { status: 400, message: "Please enter a valid number." };
    default:
      return null;
  }
}

// Used in each route's catch block: return dbErrorResponse(error)
export function dbErrorResponse(error) {
  const friendly = friendlyDbError(error);
  if (!friendly) throw error; // unknown error: Next.js logs it as a 500
  return Response.json({ error: friendly.message }, { status: friendly.status });
}