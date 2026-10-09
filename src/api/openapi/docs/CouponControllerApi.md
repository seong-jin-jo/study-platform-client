# CouponControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getMyCoupons**](#getmycoupons) | **GET** /api/v5/coupons/me | |
|[**registerCoupon**](#registercoupon) | **POST** /api/v5/coupons/register | |

# **getMyCoupons**
> BaseResponseListMyCouponResponse getMyCoupons()


### Example

```typescript
import {
    CouponControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CouponControllerApi(configuration);

const { status, data } = await apiInstance.getMyCoupons();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponseListMyCouponResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **registerCoupon**
> BaseResponseMyCouponResponse registerCoupon(couponCodeRegisterRequest)


### Example

```typescript
import {
    CouponControllerApi,
    Configuration,
    CouponCodeRegisterRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CouponControllerApi(configuration);

let couponCodeRegisterRequest: CouponCodeRegisterRequest; //

const { status, data } = await apiInstance.registerCoupon(
    couponCodeRegisterRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **couponCodeRegisterRequest** | **CouponCodeRegisterRequest**|  | |


### Return type

**BaseResponseMyCouponResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

