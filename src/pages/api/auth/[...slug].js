// API proxy for OAuth and auth endpoints
// Forwards all requests to /auth/* to the backend server

export default async function handler(req, res) {
    const { slug } = req.query;
    const path = Array.isArray(slug) ? slug.join('/') : slug;
    
    // Get the backend URL from environment
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const forwardUrl = `${backendUrl}/auth/${path}`;
    
    console.log(`🔄 Proxying auth request: ${req.method} ${path}`);
    console.log(`   Forwarding to: ${forwardUrl}`);
    console.log(`   Incoming cookies:`, req.headers.cookie);
    
    try {
        // Build query string if it exists
        const queryString = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
        
        // Forward the request with headers and body
        const options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                // Pass through cookies from browser
                ...(req.headers.cookie && { 'cookie': req.headers.cookie })
            },
            redirect: 'manual' // Handle redirects manually to preserve cookies
        };
        
        // Add body for POST requests
        if (req.method !== 'GET' && req.body) {
            options.body = JSON.stringify(req.body);
        }
        
        const response = await fetch(forwardUrl + queryString, options);
        
        console.log(`   Backend response status:`, response.status);
        console.log(`   Backend Set-Cookie:`, response.headers.get('set-cookie'));
        
        // Copy response headers, especially Set-Cookie
        for (const [key, value] of response.headers) {
            // Set-Cookie needs special handling
            if (key.toLowerCase() === 'set-cookie') {
                console.log(`   Forwarding Set-Cookie:`, value);
                res.setHeader('Set-Cookie', value);
            } else if (key.toLowerCase() !== 'content-encoding') {
                res.setHeader(key, value);
            }
        }
        
        // Handle redirects
        if ((response.status === 302 || response.status === 301) && response.headers.get('location')) {
            const location = response.headers.get('location');
            console.log(`🔄 Backend redirect to: ${location}`);
            
            // If backend redirects to frontend, extract and redirect
            if (location.includes('home') || location.includes('signin')) {
                res.redirect(302, location);
                return;
            }
            
            // Otherwise, proxy through to frontend
            res.redirect(302, location);
            return;
        }
        
        // Get response body
        const body = await response.text();
        
        res.status(response.status).send(body);
        
    } catch (error) {
        console.error('❌ Auth proxy error:', error.message);
        res.status(500).json({ message: 'Auth proxy error', error: error.message });
    }
}
