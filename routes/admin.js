var express = require('express');
const { Db } = require('mongodb');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
var adminHelpers = require('../helpers/admin-helpers');
const { response } = require('express');

const verifyAdmin = (req, res, next)=>{
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('/admin/login')
  }
}

/* GET users listing. */
router.get('/', function (req, res, next) {
  if(req.session.adminLoggedIn){
    productHelpers.getAllProducts().then((products) => {
      res.render('admin/show-products', {admin: true, products});
    })
  }else{
    res.redirect('/admin/login')
  }

  

 
});

router.get('/add-product', verifyAdmin, (req, res) => {
  res.render('admin/add-product', {
    admin: true
  })
})

router.post('/add-product', (req, res) => {

  productHelpers.addProduct(req.body).then((id)=>{
    let image1 = req.files.image1
    let image2 = req.files.image2
    let image3 = req.files.image3
    let image4 = req.files.image4

    
    image1.mv('./public/product-images/' + id + '.jpg').then(()=>{
      image2.mv('./public/product-images/' + id + '-1.jpg').then(()=>{
        image3.mv('./public/product-images/' + id + '-2.jpg').then(()=>{
          image4.mv('./public/product-images/' + id + '-3.jpg').then(()=>{
            res.redirect('/admin')
          })
        })
      })
    })
      
    
})
})
  
  

  
  




router.get('/delete-product/:id',(req, res)=>{
  let productID = req.params.id;
  productHelpers.deleteProduct(productID).then((response)=>{
    res.redirect('/admin/')
  })
})

router.get('/edit-product/:id',async (req,res)=>{
  let product =await productHelpers.getProductDetails(req.params.id)
  res.render('admin/edit-product', {product, admin:true})
})

router.post('/edit-product/:id',(req, res)=>{
  let productID = req.params.id
  if(req.files){
    let image = req.files.Image
    image.mv('./public/product-images/' + productID + '.jpg')
  }
  productHelpers.updateProduct(req.body, productID).then(()=>{
    console.log(req.body);
    res.redirect('/admin')
  })
})

router.get('/orders',verifyAdmin,async (req, res)=>{
  let orders =await adminHelpers.getAllOrders()
  orders.reverse()
  console.log(orders)
  res.render('admin/orders', {admin:true, orders})
})

router.get('/update-order/:id', (req, res)=>{
  let orderId = req.params.id
  adminHelpers.getOrderDetails(orderId).then((orderDetails)=>{
    console.log(orderDetails);
    res.render('admin/order-details', {admin:true, orderDetails})
  })
})

router.post('/updateOrderStatus', (req, res)=>{
  adminHelpers.updateProductStatus(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/login', (req,res)=>{
  let adminLoginErr = req.session.adminloginErr
  if(req.session.adminLoggedIn){
    res.redirect('/admin')
  }else{
    res.render('admin/login',{adminLoginErr, admin:true})
    req.session.adminLoggedIn = false
  }
})

router.post('/login', (req, res)=>{
  adminHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.adminLoggedIn = true;
      res.redirect('/admin')
    }else{
      
    }
  }).catch((response)=>{
      req.session.adminloginErr = "Username or password is incorrect"
      res.redirect('/admin/login')
  })
})

router.get('/add-coupon', (req, res)=>{
  res.render('admin/add-coupon')
})

router.post('/add-coupon',(req, res)=>{
  adminHelpers.addCoupon(req.body).then(()=>{
    res.redirect('/admin')
  })
})

module.exports = router;