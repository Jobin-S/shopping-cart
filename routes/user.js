const { response, Router } = require('express');
var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
var userHelpers = require('../helpers/user-helpers')


const verifyLogin = (req, res, next)=>{
  if(req.session.LoggedIn){
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
    res.render('user/view-products', { products, user, cartCount });
    console.log(user);
  })  
});

router.get('/login',(req, res) => {
  if(req.session.LoggedIn)
    res.redirect('/')
  else{
    res.render('user/login',{"loginErr":req.session.loginErr})
    req.session.loginErr = false
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
    
      req.session.LoggedIn = true
      req.session.user = response
      res.redirect('/')
    
    
  })
})

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.LoggedIn = true;
      req.session.user =  response.user
      res.redirect('/')
    }else{
      req.session.loginErr = "Username or password is incorrect"
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.destroy()
  res.redirect('/')
})



router.get('/cart',verifyLogin,async (req, res)=>{
  let user = req.session.user;
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let total = 0;
  if(products.length>0){
    total = await userHelpers.getTotalAmount(req.session.user._id)
  }
  res.render('user/cart', {user, products, total})
})

router.get('/add-to-cart/:id',verifyLogin, (req, res)=>{
  console.log('api call');
  userHelpers.addToCart(req.params.id, req.session.user._id).then(()=>{
    res.json({status:true})
  })
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
  let total = await userHelpers.getTotalAmount(user._id)
  res.render('user/place-order',{user, total})
})

router.post('/place-order',async (req, res)=>{
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId)=>{
    if(req.body['payment-method']=='COD'){
      res.json({codSuccess:true})
    }else if(req.body['payment-method']=='ONLINE'){
      userHelpers.generateRazorpay(orderId, totalPrice).then((response)=>{
        res.json(response)
      })
    }else{
      res.json({status:false})
    }
    
  })
  console.log(req.body)
} )

router.get('/confirm-order',verifyLogin, (req, res)=>{
  res.render('user/confirm-order',{user:req.session.user})
})

router.get('/orders', verifyLogin,async (req,res)=>{
  let orders =await userHelpers.getUserOrders(req.session.user._id)
  console.log(orders)
  orders.reverse()
  res.render('user/orders', {user:req.session.user, orders})
})

router.get('/view-order-products/:id',verifyLogin, async (req, res)=>{
  let products =await userHelpers.getOrderProducts(req.params.id)
  console.log(products);
  res.render('user/view-order-products', {user:req.session.user, products})
})

router.post('/verify-payment',(req, res)=>{
  console.log('verify login')
  console.log(req.body)
  console.log("recipt: ",req.body['order[receipt]'])
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      res.json({status:true})
    })
  }).catch((err)=>{
    res.json({status:false})
  })

})
module.exports = router;