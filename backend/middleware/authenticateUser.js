const supabase = require('../supabase');

async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Missing or invalid authorization header'
            });
        }

        const accessToken = authHeader.split(' ')[1];

        // Verifies the access token and retrieves the user information from Supabase
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            return res.status(401).json({
                error: 'Invalid or expired access token'
            });
        }

        req.user = user;

        next();
    } catch (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({
            error: 'Authentication failed'
        });
    }
}

module.exports = authenticateUser;