-- AlterTable
ALTER TABLE "monitors" ADD COLUMN     "auth_password" TEXT,
ADD COLUMN     "auth_type" TEXT DEFAULT 'none',
ADD COLUMN     "auth_username" TEXT,
ADD COLUMN     "follow_redirects" BOOLEAN DEFAULT true,
ADD COLUMN     "headers" JSONB,
ADD COLUMN     "http_method" TEXT DEFAULT 'HEAD',
ADD COLUMN     "request_body" TEXT,
ADD COLUMN     "send_json" BOOLEAN DEFAULT false,
ADD COLUMN     "slow_response_alert" BOOLEAN DEFAULT false,
ADD COLUMN     "slow_response_threshold_ms" INTEGER DEFAULT 1000,
ALTER COLUMN "expected_status" SET DATA TYPE TEXT[];
