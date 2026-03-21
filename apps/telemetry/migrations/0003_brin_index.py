from django.db import migrations


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("telemetry", "0002_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_location_timestamp_brin
            ON telemetry_locations USING BRIN (timestamp);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_location_timestamp_brin;",
        ),
        migrations.RunSQL(
            sql="""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS
                idx_location_point_gist
            ON telemetry_locations USING GIST (point);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_location_point_gist;",
        ),
    ]