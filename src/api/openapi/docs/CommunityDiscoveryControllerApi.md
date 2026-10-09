# CommunityDiscoveryControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getRepContext**](#getrepcontext) | **GET** /api/v1/community/rep/context | |
|[**getSitemapResources1**](#getsitemapresources1) | **GET** /api/v1/community/sitemap-resources | 커뮤니티 sitemap resource snapshot|

# **getRepContext**
> BaseResponseCommunityRepContextResponse getRepContext()


### Example

```typescript
import {
    CommunityDiscoveryControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityDiscoveryControllerApi(configuration);

let roomsCursor: string; // (optional) (default to undefined)
let postsCursor: string; // (optional) (default to undefined)
let size: number; // (optional) (default to 10)

const { status, data } = await apiInstance.getRepContext(
    roomsCursor,
    postsCursor,
    size
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **roomsCursor** | [**string**] |  | (optional) defaults to undefined|
| **postsCursor** | [**string**] |  | (optional) defaults to undefined|
| **size** | [**number**] |  | (optional) defaults to 10|


### Return type

**BaseResponseCommunityRepContextResponse**

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

# **getSitemapResources1**
> BaseResponseCommunitySitemapResourceResponse getSitemapResources1()


### Example

```typescript
import {
    CommunityDiscoveryControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityDiscoveryControllerApi(configuration);

let types: string; // (optional) (default to 'POST,ROOM,QUESTION')
let cursor: string; // (optional) (default to undefined)
let size: number; // (optional) (default to 1000)
let snapshot: string; // (optional) (default to undefined)
let partitionStartExclusive: string; // (optional) (default to undefined)
let partitionEndInclusive: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getSitemapResources1(
    types,
    cursor,
    size,
    snapshot,
    partitionStartExclusive,
    partitionEndInclusive
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **types** | [**string**] |  | (optional) defaults to 'POST,ROOM,QUESTION'|
| **cursor** | [**string**] |  | (optional) defaults to undefined|
| **size** | [**number**] |  | (optional) defaults to 1000|
| **snapshot** | [**string**] |  | (optional) defaults to undefined|
| **partitionStartExclusive** | [**string**] |  | (optional) defaults to undefined|
| **partitionEndInclusive** | [**string**] |  | (optional) defaults to undefined|


### Return type

**BaseResponseCommunitySitemapResourceResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 서명된 snapshot과 resource page |  -  |
|**400** | snapshot/cursor/type/range 오류 |  -  |
|**409** | dataset watermark 변경으로 snapshot 무효화 |  -  |
|**500** | pagination invariant 위반 |  -  |
|**503** | sitemap dependency 일시 장애 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

