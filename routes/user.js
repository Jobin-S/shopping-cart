const { response, Router } = require('express');
var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
var userHelpers = require('../helpers/user-helpers')
const db = require('../config/connection')
var collection = require('../config/collections')
var objectId = require('mongodb').ObjectID;





const verifyLogin = (req, res, next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/',async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;
  if(user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products) => {
    console.log(cartCount);
    res.render('user/view-products', { products, user, cartCount });
    console.log(user);
  })  
});

router.get('/login',(req, res) => {
  if(req.session.userLoggedIn)
    res.redirect('/')
  else{
    res.render('user/login',{"userloginErr":req.session.userloginErr})
    req.session.userloginErr = false
  }

})

router.get('/signup',(req, res) => {
  if(req.session.LoggedIn){
    res.redirect('/')
  }else{
    res.render('user/signup')
  }
  
})

router.post('/signup',(req, res)=>{
  userHelpers.doSignup(req.body).then((response)=>{
    
      req.session.user = response
      req.session.userLoggedIn = true

      res.redirect('/')
    
    
  })
})

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.user =  response.user
      req.session.userLoggedIn = true;

      res.redirect('/')
    }else{
      req.session.userloginErr = "Username or password is incorrect"
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user = null;
  req.session.userLoggedIn = false
  res.redirect('/')
})

router.get('/empty_cart', (req, res) => {
  res.render('user/empty_cart');
})

router.get('/cart',verifyLogin,async (req, res)=>{
  let user = req.session.user;
  let products = await userHelpers.getCartProducts(req.session.user._id)
  console.log(products);
  let total = 0;
  if(products.length>0){
    total = await userHelpers.getTotalAmount(req.session.user._id)
  }else {
    res.redirect('/empty_cart')
  }
  let cartCount = null;
  if(user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  res.render('user/cart', {user, products, total, cartCount})
})

router.get('/add-to-cart/:id', (req, res)=>{
  console.log('api call');
  console.log(req.session.user);
  if(req.session.userLoggedIn){
    userHelpers.addToCart(req.params.id, req.session.user._id, 1).then(()=>{
      res.json({status:true})
    })
  }else if(req.session.user == undefined){
    res.redirect('/login')
  }
})

router.post('/add-to-cart', (req, res)=>{
  if(req.session.userLoggedIn){
    console.log(req.body.count);
    userHelpers.addToCart(req.body.id, req.session.user._id, req.body.count).then(()=>{
      res.json({status:true})
    })
  }else if(req.session.user == undefined){
    res.redirect('/login')
  }
})

router.post('/change-product-quantity',(req, res)=>{
  userHelpers.changeproductQuantity(req.body).then(async(response)=>{
    console.log('quantity changed');
  response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.post('/remove-item',(req, res)=>{
  console.log('removeitem api call');
  userHelpers.RemoveItem(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req, res)=>{
  let user = req.session.user
  let cartCount = null;
  if(user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let total = await userHelpers.getTotalAmount(user._id)
  userHelpers.getCartProducts(user._id).then((cartItems)=>{
    console.log(cartItems)
    userHelpers.isCouponAvailable(user._id).then((response)=>{
      console.log('coupon available: '+response.status);
      let coupon = {
        status:false
      }
      if(response.status){
        coupon = {
          details:req.session.user.couponDetails,
          offerPrice:req.session.user.offerPrice,
          status:true
        }
        console.log(coupon);
      }
        
      
      res.render('user/place-order', {user, total, cartItems, cartCount, coupon})
    })

  })

})

router.post('/place-order',async (req, res)=>{
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  let offerPrice = req.session.user.offerPrice

  userHelpers.placeOrder(req.body, products, totalPrice, offerPrice).then((orderId)=>{
    if(req.body['payment-method']=='COD'){
      req.session.user.orderId = orderId;
      db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(req.session.user._id)})//removeing cart
      res.json({codSuccess:true})
    }else if(req.body['payment-method']=='ONLINE'){
      
      userHelpers.generateRazorpay(orderId, totalPrice, offerPrice).then((response)=>{
        res.json(response)
      })
    }else{
      res.json({status:false})
    }
    
  })
  console.log(req.body)
} )

router.get('/confirm-order',verifyLogin, (req, res)=>{
 
    if(req.session.user.orderId == null){
      res.redirect('/orders')
    }else{
      userHelpers.getSingleOrder(req.session.user.orderId).then(async (order)=>{
        let products =await userHelpers.getOrderProducts(req.session.user.orderId)

          res.render('user/confirm-order',{user:req.session.user, order, products})
          db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(req.session.user._id)})//removeing cart
          req.session.user.orderId = null;
          req.session.user.couponDetails = null
          req.session.user.offerPrice = null
        })     
    }
})

router.get('/orders',async (req,res)=>{
  
  if(req.session.userLoggedIn){
    let orders =await userHelpers.getUserOrders(req.session.user._id)
    console.log(orders)
    orders.reverse()
    let cartCount = null;
  if(req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
    res.render('user/orders', {user:req.session.user, orders, cartCount})
  }else{
    res.redirect('/login')
  }
  
})

router.get('/view-order-products/:id',verifyLogin, async (req, res)=>{
  let products =await userHelpers.getOrderProducts(req.params.id)
  console.log(products);
  res.render('user/view-order-products', {user:req.session.user, products})
})

router.post('/verify-payment',(req, res)=>{
  console.log('verify login')
  // console.log(req.body)
  // console.log("recipt: ",req.body['order[receipt]'])
  userHelpers.verifyPayment(req.body).then(()=>{
    console.log('verify payment :');
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{  
      req.session.user.orderId = req.body['order[receipt]']
      res.json({status:true})
    })
  }).catch((err)=>{
    res.json({status:false})
  })

})

router.get('/product/:id',async (req, res)=>{
  let productId = req.params.id
  let cartCount = null;
  if(req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  userHelpers.getSingleProduct(productId).then((product)=>{
    console.log(product);
    
    res.render('user/single-product', {user:req.session.user, product, cartCount})
  })
})




router.post('/coupon', (req, res)=>{
  let couponCode = req.body.coupon.toUpperCase();
  console.log(couponCode);
userHelpers.VerifyCoupon(couponCode, req.session.user._id)
    .then(async(details)=>{
      console.log('available');
      let response = {
        status:true,
        details:details
      }

      let userId = req.session.user._id
      let cartPrice = await userHelpers.getTotalAmount(userId)

      userHelpers.couponPrice(details, userId, cartPrice, couponCode).then((offerPrice)=>{
        req.session.user.offerPrice = offerPrice
        req.session.user.couponDetails = details
        response.offerPrice = offerPrice
        res.json(response)
      })
      
    })
    .catch(()=>{
      res.json({status:false})
    })
})

module.exports = router;