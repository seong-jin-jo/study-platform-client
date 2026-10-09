# AdminCouponControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createCoupons**](#createcoupons) | **POST** /api/v5/admin/coupons/bulk | |
|[**getCoupons**](#getcoupons) | **GET** /api/v5/admin/coupons | |

# **createCoupons**
> BaseResponseListCouponResponse createCoupons(adminCouponBulkCreateRequest)


### Example

```typescript
import {
    AdminCouponControllerApi,
    Configuration,
    AdminCouponBulkCreateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminCouponControllerApi(configuration);

let adminCouponBulkCreateRequest: AdminCouponBulkCreateRequest; //

const { status, data } = await apiInstance.createCoupons(
    adminCouponBulkCreateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **adminCouponBulkCreateRequest** | **AdminCouponBulkCreateRequest**|  | |


### Return type

**BaseResponseListCouponResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCoupons**
> BaseResponseListCouponResponse getCoupons()


### Example

```typescript
import {
    AdminCouponControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminCouponControllerApi(configuration);

const { status, data } = await apiInstance.getCoupons();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponseListCouponResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

