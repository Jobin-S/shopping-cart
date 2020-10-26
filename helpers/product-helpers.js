const db = require('../config/connection')
var collection = require('../config/collections');
const { response } = require('express');
const collections = require('../config/collections');
var objectId = require('mongodb').ObjectID;

module.exports = {
    addProduct: (product, callback) => {
        console.log(product);
        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
            callback(data.ops[0]._id)
        })
    },
    getAllProducts: () => {
        return new Promise (async (resolve, reject)=>{
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        }).catch(console.log("error"))
    },
    deleteProduct: (productID)=>{
        return new Promise ((resolve, reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:objectId(productID)}).then((response)=>{
                resolve(response)
            })
        })
    },
    getProductDetails:(productID)=>{
        return new Promise ((resolve, reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(productID)}).then((response)=>{
                resolve(response)
            })
        })
    },
    updateProduct:(productDetails, productID)=>{
        return new Promise ((resolve, reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:objectId(productID)},{
                $set:{
                    name: productDetails.name,
                    Price:parseInt(productDetails.Price),
                    Category:productDetails.Category,
                    Discription:productDetails.Discription
                }
            }).then((response)=>{
                resolve()
            })
        })
    }
}