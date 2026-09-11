const maxAnimalMediaUploadSizeInBytes = 50 * 1024 * 1024;
const maxAnimalMediaUploadSizeLabel = "50 MB";
const animalMediaUploadChunkSizeInBytes = 4 * 1024 * 1024;
const animalMediaUploadChunkSizeLabel = "4 MB";

function findOversizedUploadFile<TFile extends { size: number }>(files: ArrayLike<TFile>) {
  return Array.from(files).find(file => file.size > maxAnimalMediaUploadSizeInBytes);
}

export {
  animalMediaUploadChunkSizeInBytes,
  animalMediaUploadChunkSizeLabel,
  findOversizedUploadFile,
  maxAnimalMediaUploadSizeInBytes,
  maxAnimalMediaUploadSizeLabel,
};
