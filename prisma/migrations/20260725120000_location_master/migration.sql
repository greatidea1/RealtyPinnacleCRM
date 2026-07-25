-- Location Master: City and Locality tables with FK refs on Property and Client

CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

CREATE TABLE "Locality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locality_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Locality_cityId_name_key" ON "Locality"("cityId", "name");
CREATE INDEX "Locality_cityId_idx" ON "Locality"("cityId");
CREATE INDEX "Locality_name_idx" ON "Locality"("name");

ALTER TABLE "Locality" ADD CONSTRAINT "Locality_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "cityId" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "localityId" TEXT;

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "preferredCityId" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "preferredLocalityId" TEXT;

CREATE INDEX "Property_cityId_idx" ON "Property"("cityId");
CREATE INDEX "Property_localityId_idx" ON "Property"("localityId");
CREATE INDEX "Client_preferredCityId_idx" ON "Client"("preferredCityId");
CREATE INDEX "Client_preferredLocalityId_idx" ON "Client"("preferredLocalityId");

ALTER TABLE "Property" ADD CONSTRAINT "Property_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_preferredCityId_fkey" FOREIGN KEY ("preferredCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_preferredLocalityId_fkey" FOREIGN KEY ("preferredLocalityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;
