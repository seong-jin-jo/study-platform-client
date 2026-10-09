# LessonContentWebhookControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**handlePush**](#handlepush) | **POST** /api/v5/webhooks/lesson-content | |

# **handlePush**
> BaseResponseMapStringObject handlePush(body)


### Example

```typescript
import {
    LessonContentWebhookControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new LessonContentWebhookControllerApi(configuration);

let body: string; //
let xHubSignature256: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.handlePush(
    body,
    xHubSignature256
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **string**|  | |
| **xHubSignature256** | [**string**] |  | (optional) defaults to undefined|


### Return type

**BaseResponseMapStringObject**

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

