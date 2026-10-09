# MemberAttributionApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**record**](#record) | **POST** /api/v1/members/me/attribution | |

# **record**
> BaseResponseMapStringBoolean record(attributionRecordRequest)


### Example

```typescript
import {
    MemberAttributionApi,
    Configuration,
    AttributionRecordRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new MemberAttributionApi(configuration);

let attributionRecordRequest: AttributionRecordRequest; //

const { status, data } = await apiInstance.record(
    attributionRecordRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **attributionRecordRequest** | **AttributionRecordRequest**|  | |


### Return type

**BaseResponseMapStringBoolean**

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

