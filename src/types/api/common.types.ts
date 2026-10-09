// Shared image/profile types extracted from the deleted legacy group-study.types.ts.
// Kept because surviving features (community channel, inquiry, leader store) reference them.

export interface ImageSizeType {
  imageTypeName?: string;
  width?: number;
  height?: number;
}

export interface ResizedImage {
  resizedImageId: number;
  resizedImageUrl: string;
  imageSizeType: ImageSizeType;
}

export interface ProfileImage {
  imageId: number;
  resizedImages: ResizedImage[];
}

export interface Leader {
  memberId?: number;
  memberNickname?: string;
  profileImage?: ProfileImage;
  simpleIntroduction?: string;
}
