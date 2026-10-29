/** Session cookie name (the __Host- prefix forces Secure, Path=/ and no Domain in production). */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-ta_session" : "ta_session";
