# AdminStibeeApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**exportCsv**](#exportcsv) | **GET** /api/v5/admin/stibee/export.csv | |
|[**retry**](#retry) | **POST** /api/v5/admin/stibee/outbox/{id}/retry | |
|[**subscribers**](#subscribers) | **GET** /api/v5/admin/stibee/subscribers | |

# **exportCsv**
> string exportCsv()


### Example

```typescript
import {
    AdminStibeeApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminStibeeApi(configuration);

let consent: string; // (optional) (default to 'email')

const { status, data } = await apiInstance.exportCsv(
    consent
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **consent** | [**string**] |  | (optional) defaults to 'email'|


### Return type

**string**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/csv;charset=UTF-8, text/csv; charset=UTF-8, */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **retry**
> BaseResponseVoid retry()


### Example

```typescript
import {
    AdminStibeeApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminStibeeApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.retry(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseVoid**

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

# **subscribers**
> BaseResponseListSubscriberView subscribers()


### Example

```typescript
import {
    AdminStibeeApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminStibeeApi(configuration);

let tag: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.subscribers(
    tag
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **tag** | [**string**] |  | (optional) defaults to undefined|


### Return type

**BaseResponseListSubscriberView**

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

