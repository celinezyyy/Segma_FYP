import jwt from "jsonwebtoken";

const userAuth = async(req, res, next) =>{

    const {token} = req.cookies;

    if(!token){
        return res.json({success:false, message: 'Not Authorized. Session Expired, Please Login Again'});    
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

        if(tokenDecode.id){
            req.userId = tokenDecode.id;
            req.role = tokenDecode.role; 
        }else{
            return res.json({success:false, message: "Not Authorized. Session Expired, Please Login Again"});
        }
        next();
        
    } catch (error) {
        res.json({success:false, message: error.message});
    }
}

export default userAuth;