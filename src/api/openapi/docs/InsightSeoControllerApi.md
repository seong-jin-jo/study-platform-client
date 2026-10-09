# InsightSeoControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getArticle**](#getarticle) | **GET** /api/v1/insight/seo-documents/articles/{slug} | 공개 인사이트 글 SEO projection|
|[**getIsland**](#getisland) | **GET** /api/v1/insight/seo-documents/islands/{slug} | 공개 인사이트 섬 SEO projection|
|[**getSitemapResources**](#getsitemapresources) | **GET** /api/v1/insight/sitemap-resources | 인사이트 sitemap resource snapshot|

# **getArticle**
> InsightApiResponseInsightArticleSeoDocumentResponse getArticle()

인증 정보를 무시하는 public metadata projection

### Example

```typescript
import {
    InsightSeoControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightSeoControllerApi(configuration);

let slug: string; // (default to undefined)

const { status, data } = await apiInstance.getArticle(
    slug
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **slug** | [**string**] |  | defaults to undefined|


### Return type

**InsightApiResponseInsightArticleSeoDocumentResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 공개 글 SEO 문서 |  -  |
|**404** | 발행 글 또는 활성 연결 없음 |  -  |
|**500** | 활성 연결 무결성 오류 |  -  |
|**503** | 공개 dependency 일시 장애 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getIsland**
> InsightApiResponseInsightIslandSeoDocumentResponse getIsland()

개인 진행·예산·반응을 제외한 public projection

### Example

```typescript
import {
    InsightSeoControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightSeoControllerApi(configuration);

let slug: string; // (default to undefined)

const { status, data } = await apiInstance.getIsland(
    slug
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **slug** | [**string**] |  | defaults to undefined|


### Return type

**InsightApiResponseInsightIslandSeoDocumentResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 공개 섬 SEO 문서 |  -  |
|**404** | 발행 섬 또는 발행 글 없음 |  -  |
|**500** | SEO projection 무결성 오류 |  -  |
|**503** | 공개 dependency 일시 장애 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getSitemapResources**
> InsightApiResponseInsightSitemapResourceResponse getSitemapResources()


### Example

```typescript
import {
    InsightSeoControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightSeoControllerApi(configuration);

let types: string; // (optional) (default to 'ARTICLE,ISLAND,KOAN')
let cursor: string; // (optional) (default to undefined)
let snapshot: string; // (optional) (default to undefined)
let size: number; // (optional) (default to 1000)
let partitionStartExclusive: string; // (optional) (default to undefined)
let partitionEndInclusive: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getSitemapResources(
    types,
    cursor,
    snapshot,
    size,
    partitionStartExclusive,
    partitionEndInclusive
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **types** | [**string**] |  | (optional) defaults to 'ARTICLE,ISLAND,KOAN'|
| **cursor** | [**string**] |  | (optional) defaults to undefined|
| **snapshot** | [**string**] |  | (optional) defaults to undefined|
| **size** | [**number**] |  | (optional) defaults to 1000|
| **partitionStartExclusive** | [**string**] |  | (optional) defaults to undefined|
| **partitionEndInclusive** | [**string**] |  | (optional) defaults to undefined|


### Return type

**InsightApiResponseInsightSitemapResourceResponse**

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

