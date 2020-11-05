const db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
var objectId = require('mongodb').ObjectID;
var Razorpay = require('razorpay')

var instance = new Razorpay({
    key_id: 'rzp_test_lWAtz2c0Foyv22',
    key_secret: '6pb1Egfiw0ybU7SXgou8yX3m',
  });

module.exports = {
    doSignup:(userData)=>{
        return new Promise(async  (resolve, reject)=>{
            userData.Password =await bcrypt.hash(userData.Password,10)
        db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
            resolve(data.ops[0])
        })
        })
        
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve, reject)=>{
            let loginStatus = false;
            let response = {}
            let user =await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if(user){
                bcrypt.compare(userData.Password, user.Password).then((status)=>{
                    if(status){
                        console.log('login Succesful', status);
                        response.user = user;
                        response.status = true;
                        resolve(response)
                    }else{
                        console.log('login failed', status);
                        resolve({status:false})
                    }
                })
            }else{
                console.log('login failed');
                resolve({status:false})
            }
        })
    },
    addToCart:(productId, userId, count)=>{

        count = parseInt(count)
        console.log(count);

        let proObj = {
            item:objectId(productId),
            quantity:parseInt(count)
        }
        
        return new Promise (async(resolve, reject)=>{
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
        
            if(userCart){
                let proExist = userCart.products.findIndex(product=> product.item==productId)           

                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:objectId(userId),'products.item':objectId(productId)},
                    {
                        $inc:{'products.$.quantity':count}
                    }
                        
                    ).then(()=>{
                        resolve()
                    })
                }else{

                db.get().collection(collection.CART_COLLECTION)
                .updateOne({user: objectId(userId)},
                {
                    $push:{products:proObj}
                }
                ).then((response)=>{
                    resolve()
                })
            }
            }else{
        

                let cartObj = {
                    user:objectId(userId),
                    products:[proObj]
                }

                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()

                })
            }
        })
        

    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve, reject)=>{
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1, quantity:1,product:{ $arrayElemAt: ['$product',0]}
                    }
                }
                
                
            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve, reject)=>{
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if (cart){
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeproductQuantity:(details)=>{
        count = parseInt(details.count)
        return new Promise((resolve, reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({'_id':objectId(details.cart)},
                {
                    $pull: {'products':{item:objectId(details.product)}}
                }
                ).then((response)=>{
                    resolve({removeProduct:true, productId:details.productId})
                })
            }else{
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
                    {
                        $inc:{'products.$.quantity':count}
                    }
                        
                    ).then(()=>{
                        
                        resolve({removeProduct:false, productId:details.productId})
                    })
            }
            
        })
    },
    RemoveItem:(details)=>{
        return new Promise((resolve, reject)=>{
            console.log(details);
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({'_id':objectId(details.cart)},
            {
                $pull: {'products':{item:objectId(details.product)}}
            },false,
            true).then(()=>{
                resolve({status:true})
            })
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve, reject)=>{
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1, quantity:1,product:{ $arrayElemAt: ['$product',0]}
                    }
                },
                 { $addFields: {
                convertprice: {$toInt:"$product.Price" }   
             }
                
            },
                {   
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity', '$convertprice']}}
                    }
                }
                
                
                
            ]).toArray()
            resolve(total[0].total)
        })
    },
    placeOrder:(order, products, total)=>{
        return new Promise((resolve, reject) => {
            let status = order['payment-method']==="COD"?'placed':'pending'
            let orderObj = {
                deliveryDetails:{
                    name:order.name,
                    mobile:order.mobile,
                    email:order.email,
                    addressLine1:order.addLine1,
                    addressLine2:order.addLine2,
                    city:order.city,
                    pincode:order.pincode
                },
                userId:objectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date: new Date()
            }   
            console.log(orderObj);
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                console.log('order id'+response.ops[0]._id);
                // db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(order.userId)})//removeing cart
                resolve(response.ops[0]._id)
            })
        })
                
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            resolve(cart.products)
        })
        
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
            .find({userId:objectId(userId)}).toArray()
            console.log('order:',orders[0]);
            resolve(orders)
        })
        
    },
    getOrderProducts:(productId)=>{
        return new Promise(async(resolve, reject)=>{
            let orderItem = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(productId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1, quantity:1,product:{ $arrayElemAt: ['$product',0]}
                    }
                }
                
                
            ]).toArray()
            console.log(orderItem);
            resolve(orderItem)
        })
    },
    generateRazorpay:(orderId, totalPrice)=>{
        return new Promise((resolve, reject) => {
            var options = {
                amount: totalPrice*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId 
              };
              instance.orders.create(options, function(err, order) {
                console.log("New order:",order);
                console.log('error', err);
                    resolve(order)
                

                
              });
        })
        
    },
    verifyPayment:(details)=>{
        return new Promise((resolve, reject) => {
            const crpto = require('crypto')
            let hmac = crpto.createHmac('sha256', '6pb1Egfiw0ybU7SXgou8yX3m')
            console.log(details);

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            console.log(hmac);
            if(hmac==details['payment[razorpay_signature]']){
                console.log('verified payment done');

                resolve()
            }else{
                reject()
                console.log('rejeccted');
            }
        })
        
    },
    changePaymentStatus:(orderId)=>{
        console.log('chnage payment stus callled');
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:"placed"
                }
            }
            ).then(()=>{
                
                resolve()
            })
        })
    },
    getSingleOrder:(orderId)=>{
        console.log(orderId);
        return new Promise(async(resolve, reject) => {
            let order =  await db.get().collection(collection.ORDER_COLLECTION)
            .findOne({_id:objectId(orderId)})
            console.log('order from orders')
            console.log(order)
            resolve(order)
        })
        
    },
    getSingleProduct:(productId)=>{
        return new Promise(async(resolve, reject) => {
            let productDetails = await db.get().collection(collection.PRODUCT_COLLECTION)
            .findOne({_id:objectId(productId)})
            resolve(productDetails)
        })
        
    }
}
