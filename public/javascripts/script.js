        function addToCart(proId){
            $.ajax({
                url:'/add-to-cart/'+proId,
                method:"get",
                success:(response)=>{
                    if(response.status){
                        let count = $('#cart-count').html()
                        count = parseInt(count)+1
                        $('#cart-count').html(count)
                    }
                    
                }
            })
        }
        function readUrl(input) {

            if (input.files && input.files[0]) {
              let reader = new FileReader();
              reader.onload = e => {
                let imgData = e.target.result;
                let imgName = input.files[0].name;
                input.setAttribute("data-title", imgName);
                console.log(e.target.result);
              };
              reader.readAsDataURL(input.files[0]);
            }
          
          }

          

          function applyCoupon() {
            let coupontext = document.getElementById('couponText').value
            console.log(coupontext)
            $.ajax({
                url: '/coupon',
                method: 'POST',
                data: {
                    coupon: coupontext
                },
                success: (response) => {
                  let statusDiv = document.getElementById('couponStatus')
                  let statusDivFailed = document.getElementById('couponStatus_failed')
                    if(response.status){
                      statusDivFailed.style.display = 'none'
                      statusDiv.style.display = 'block'
                      let offerPrice = response.offerPrice;

                      var oldSubtotal  = strikePrice('subTotal')

                      document.getElementById('discountPrice').textContent = oldSubtotal-offerPrice   
                      
                      let discountLi = document.getElementById('discountPrice_li')
                      discountLi.style.display = 'block'
                      total(parseInt(oldSubtotal-offerPrice))

                      let couponCode = response.details.couponCode
                      console.log(couponCode)
                      let couponStatusMsg = document.getElementById('couponStatus_h2')
                      couponStatusMsg.textContent = `coupon applied : ${couponCode}`
                      
                      
                    }else{
                      statusDiv.style.display = 'none'
                      statusDivFailed.style.display = 'block'
                    }
                  }
            })
        }

        function strikePrice(id){
          let oldSubtotal = document.getElementById(id).textContent
          document.getElementById(id).textContent = ''
          var strikeElement = document.createElement("s");
          var node = document.createTextNode(oldSubtotal);
          strikeElement.appendChild(node)
          var spanElement = document.getElementById(id);
          spanElement.appendChild(strikeElement)
          return oldSubtotal
        }

        