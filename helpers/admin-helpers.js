const db = require('../config/connection')
var collection = require('../config/collections');
const collections = require('../config/collections');
var objectId = require('mongodb').ObjectID;

module.exports = {
    getAllOrders:()=>{
        return new Promise(async(resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
            .find().toArray()
            console.log(orders);
            resolve(orders)
        })
    },
    getOrderDetails:(orderId)=>{
        return new Promise(async(resolve, reject) => {
        let orderDetails = await db.get().collection(collections.ORDER_COLLECTION).findOne({_id:objectId(orderId)})
        resolve(orderDetails)
        })
        
    },
    updateProductStatus:(details)=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(details.orderId)},{
                $set:{
                    status:details.newStatus
                }
            }).then(()=>{
                resolve({status:true})
            })
        });
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve, reject)=>{
            if(userData.email == "admin@admin.com" && userData.password == 'admin123'){
                resolve({status:true})
            }else{
                reject({status:false})
            }
        })
    },
    addCoupon:(details)=>{
        return new Promise((resolve, reject) => {
            console.log(details);
            couponObj = {

                title:details.title,
                couponCode:details.coupon_code,
                offerPercentage:details.offer_percentage,
                maximumAmount:details.max_amount,
                minPurchase:details.min_purchase,
                description:details.des
            }
            db.get().collection(collection.COUPON_COLLECTION).insertOne(couponObj).then(()=>{
                resolve()
            })
        })
        
    }
}