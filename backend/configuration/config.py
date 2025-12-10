from pydantic_settings import BaseSettings,SettingsConfigDict


class Settings(BaseSettings):
    api_key:str
    secret_key:str
    access_token_expire_minutes:str
    database_url:str

    model_config = SettingsConfigDict(env_file=".env",env_file_encoding="utf-8",extra="ignore")


settings = Settings()