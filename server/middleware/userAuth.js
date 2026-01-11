import jwt from "jsonwebtoken";

const userAuth = async(req, res, next) =>{

    const {token} = req.cookies;

    if(!token){
        // Clear any stale auth cookie and return 401 to allow client-side redirect
        try { res.clearCookie('token'); } catch {}
        return res.status(401).json({success:false, message: 'Not Authorized. Session Expired, Please Login Again'});    
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

        if(tokenDecode.id){
            req.userId = tokenDecode.id;
            req.role = tokenDecode.role; 
        }else{
            try { res.clearCookie('token'); } catch {}
            return res.status(401).json({success:false, message: "Not Authorized. Session Expired, Please Login Again"});
        }
        next();
        
    } catch (error) {
        // On token verification errors, treat as unauthorized and clear cookie
        try { res.clearCookie('token'); } catch {}
        res.status(401).json({success:false, message: 'Not Authorized. Session Expired, Please Login Again'});
    }
}

export default userAuth;