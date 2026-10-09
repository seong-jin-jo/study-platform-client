# InsightWorldMapApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getIsland1**](#getisland1) | **GET** /api/v1/insight/islands/{islandId} | 인사이트 섬 상세 조회|
|[**getMap**](#getmap) | **GET** /api/v1/insight/map | 인사이트 섬 월드맵 조회|
|[**helpful**](#helpful) | **PUT** /api/v1/insight/articles/{documentId}/helpful/me | 도움됨 표시|
|[**progress**](#progress) | **PUT** /api/v1/insight/articles/{documentId}/progress/me | 인사이트 완독 기록과 최초 정복|
|[**recordView**](#recordview) | **PUT** /api/v1/insight/articles/{documentId}/views/me | 고유 조회 기록|
|[**unhelpful**](#unhelpful) | **DELETE** /api/v1/insight/articles/{documentId}/helpful/me | 도움됨 취소|

# **getIsland1**
> BaseResponseIsland getIsland1()


### Example

```typescript
import {
    InsightWorldMapApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightWorldMapApi(configuration);

let islandId: number; // (default to undefined)

const { status, data } = await apiInstance.getIsland1(
    islandId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **islandId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseIsland**

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

# **getMap**
> BaseResponseInsightMapResponse getMap()


### Example

```typescript
import {
    InsightWorldMapApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightWorldMapApi(configuration);

const { status, data } = await apiInstance.getMap();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponseInsightMapResponse**

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

# **helpful**
> BaseResponseInsightReactionResponse helpful()


### Example

```typescript
import {
    InsightWorldMapApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightWorldMapApi(configuration);

let documentId: string; // (default to undefined)

const { status, data } = await apiInstance.helpful(
    documentId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **documentId** | [**string**] |  | defaults to undefined|


### Return type

**BaseResponseInsightReactionResponse**

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

# **progress**
> BaseResponseInsightProgressResponse progress(insightProgressRequest)


### Example

```typescript
import {
    InsightWorldMapApi,
    Configuration,
    InsightProgressRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightWorldMapApi(configuration);

let documentId: string; // (default to undefined)
let insightProgressRequest: InsightProgressRequest; //

const { status, data } = await apiInstance.progress(
    documentId,
    insightProgressRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **insightProgressRequest** | **InsightProgressRequest**|  | |
| **documentId** | [**string**] |  | defaults to undefined|


### Return type

**BaseResponseInsightProgressResponse**

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

# **recordView**
> BaseResponseVoid recordView()


### Example

```typescript
import {
    InsightWorldMapApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightWorldMapApi(configuration);

let documentId: string; // (default to undefined)
let xInsightViewerKey: string; // (default to undefined)

const { status, data } = await apiInstance.recordView(
    documentId,
    xInsightViewerKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **documentId** | [**string**] |  | defaults to undefined|
| **xInsightViewerKey** | [**string**] |  | defaults to undefined|


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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **unhelpful**
> BaseResponseInsightReactionResponse unhelpful()


### Example

```typescript
import {
    InsightWorldMapApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightWorldMapApi(configuration);

let documentId: string; // (default to undefined)

const { status, data } = await apiInstance.unhelpful(
    documentId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **documentId** | [**string**] |  | defaults to undefined|


### Return type

**BaseResponseInsightReactionResponse**

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

