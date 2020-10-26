var express = require('express');
const { Db } = require('mongodb');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
var adminHelpers = require('../helpers/admin-helpers')


/* GET users listing. */
router.get('/', function (req, res, next) {

  productHelpers.getAllProducts().then((products) => {
    res.render('admin/show-products', {admin: true, products});
  })

 
});

router.get('/add-product', (req, res) => {
  res.render('admin/add-product', {
    admin: true
  })
})

router.post('/add-product', (req, res) => {

  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpg', (err, data) => {
      if (!err) {
        productHelpers.getAllProducts().then((products) => {
          res.render('admin/show-products', {admin: true, products});
        })
      }
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

router.get('/orders',async (req, res)=>{
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

module.exports = router;